import { Injectable, Logger } from '@nestjs/common'
import { Prisma, Source } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ZecatService } from './zecat.service'
import { ZecatProduct } from './zecat.types'
import { PricingConfigService } from '../pricing-config/pricing-config.service'

@Injectable()
export class ZecatSyncService {
  private readonly logger = new Logger(ZecatSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly zecat: ZecatService,
    private readonly pricingConfig: PricingConfigService,
  ) { }

  async syncCategories() {
    const resp = await this.zecat.listCategories();
    const cats = Array.isArray(resp) ? resp : resp.families;
    if (!Array.isArray(cats)) {
      this.logger.error('[syncCategories] Respuesta inesperada de categorías', { resp });
      return;
    }

    for (const cat of cats) {
      const existing = await this.prisma.category.findUnique({
        where: { externalId: String(cat.id) },
        select: { lockName: true, lockImage: true },
      })

      const updateData: any = { source: Source.ZECAT, updatedAt: new Date() }
      if (!existing?.lockName) updateData.name = cat.title ?? cat.name ?? 'Sin categoría'
      if (!existing?.lockImage) updateData.imageUrl = cat.icon_url ?? cat.icon_active_url ?? ''

      await this.prisma.category.upsert({
        where: { externalId: String(cat.id) },
        update: updateData,
        create: {
          name: cat.title ?? cat.name ?? 'Sin categoría',
          imageUrl: cat.icon_url ?? cat.icon_active_url ?? '',
          externalId: String(cat.id),
          source: Source.ZECAT,
        },
      })
    }
  }

  // Sync rápido: usa datos del listado genérico, sin llamar al endpoint de detalle por producto.
  // Recomendado por Zecat para sincronizaciones frecuentes (cada hora).
  async syncProductsFast() {
    let page = 1
    const pageSize = Number(process.env.ZECAT_SYNC_PAGE_SIZE ?? 50)

    const priceFactor = await this.getPriceFactorSafe()
    this.logger.log(
      `[syncProductsFast] Factor de precio: ${priceFactor.toString()}`,
    )

    while (true) {
      const list: any = await this.zecat.listProducts(page, pageSize)
      const itemsRaw = (list as any)?.genericProducts ?? (list as any)?.generic_products
      const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : []

      if (items.length === 0) break

      for (const productFromApi of items) {
        try {
          await this.upsertProductFromZecat(productFromApi as ZecatProduct, priceFactor)
        } catch (error) {
          this.logger.error('[syncProductsFast] Error procesando producto', { productFromApi })
          this.logger.error(error as any)
        }
      }

      if (items.length < pageSize) break
      page++
    }
  }

  // Sync completo: llama al endpoint de detalle por cada producto para obtener
  // fotos de variantes, técnicas de impresión y datos de producción.
  // Recomendado por Zecat solo entre las 23 hs y las 6 hs.
  async syncProducts() {
    let page = 1
    const pageSize = Number(process.env.ZECAT_SYNC_PAGE_SIZE ?? 50)

    const priceFactor = await this.getPriceFactorSafe()
    this.logger.log(
      `[syncProducts] Factor de precio: ${priceFactor.toString()}`,
    )

    while (true) {
      const list: any = await this.zecat.listProducts(page, pageSize)

      const itemsRaw = (list as any)?.genericProducts ?? (list as any)?.generic_products
      const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : []

      if (items.length === 0) break

      for (const productFromApi of items) {
        try {
          let fullProduct = productFromApi as ZecatProduct
          const extId = (productFromApi as any).id ?? (productFromApi as any).code
          if (extId) {
            try {
              const detail = await this.zecat.getProduct(extId)
              if (detail) {
                const ptCount = detail?.printing_types?.length ?? 0
                if (ptCount > 0) this.logger.log(`[sync] id=${extId} printing_types=${ptCount}`)
                fullProduct = detail
              }
            } catch {
              // si falla el detalle, usar el producto del listado
            }
          }
          await this.upsertProductFromZecat(fullProduct, priceFactor)
        } catch (error) {
          this.logger.error('[syncProducts] Error procesando producto Zecat', {
            productFromApi,
          })
          this.logger.error(error as any)
        }
      }

      if (items.length < pageSize) break
      page++
    }
  }
  private roundTo2(value: number): number {
    // evita problemas típicos de float (121.00000000000001)
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  private normalizeFromApi(productFromApi: ZecatProduct) {
    const externalId = String(
      (productFromApi as any).id ??
      (productFromApi as any).code ??
      (productFromApi as any).sku ??
      ''
    )

    const name =
      (productFromApi as any).name ??
      (productFromApi as any).title ??
      'Producto'

    const description = (productFromApi as any).description ?? ''

    const price = Number(
      (productFromApi as any).price ??
      (productFromApi as any).finalPrice ??
      0
    )

    const sku = (productFromApi as any).external_id
      ? String((productFromApi as any).external_id)
      : (productFromApi as any).sku
        ? String((productFromApi as any).sku)
        : null

    // Stock total = suma de stock de cada variante en products[]
    const productsArr: any[] = Array.isArray((productFromApi as any).products)
      ? (productFromApi as any).products
      : []

    const totalStock = productsArr.reduce(
      (acc: number, p: any) => acc + (Number(p.stock) || 0),
      0,
    )
    const stock = totalStock > 0 ? totalStock : null

    // isActive viene del campo published de Zecat
    const isActive = (productFromApi as any).published === true

    const famArr = Array.isArray((productFromApi as any).families)
      ? (productFromApi as any).families
      : []

    const fam = famArr.length ? famArr[0] : null

    const categoryExternalId = fam?.id != null ? String(fam.id) : 'UNCATEGORIZED'

    // En los families embebidos dentro del producto el nombre está en description
    const categoryName = fam?.description ?? fam?.title ?? fam?.name ?? 'Sin categoría'

    const imageUrls: string[] = Array.isArray((productFromApi as any).images)
      ? (productFromApi as any).images
        .map((img: any) => img?.image_url ?? img?.url ?? '')
        .filter((u: string) => !!u)
      : (productFromApi as any).image
        ? [String((productFromApi as any).image)]
        : []

    // Variantes desde products[].element_description_1/2/3
    const attributes: Record<string, string[]> = {}

    const uniqueValues = (key: string): string[] =>
      [...new Set<string>(
        productsArr
          .map((p: any) => String(p[key] ?? '').trim())
          .filter((v) => v.length > 0 && v !== '.'),
      )]

    // Obtener nombres reales de atributos desde el primer producto del array
    const firstProduct = productsArr[0] as any
    const attr1Name = firstProduct?.attribute_description_1?.trim() || firstProduct?.attribute_1?.trim() || 'Color'
    const attr2Name = firstProduct?.attribute_description_2?.trim() || firstProduct?.attribute_2?.trim() || null
    const attr3Name = firstProduct?.attribute_description_3?.trim() || firstProduct?.attribute_3?.trim() || null

    const values1 = uniqueValues('element_description_1')
    const values2 = uniqueValues('element_description_2')
    const values3 = uniqueValues('element_description_3')

    // Solo agregar si tiene más de un valor único, o si es el atributo principal (attr1)
    if (values1.length > 0) attributes[attr1Name] = values1
    // attr2 y attr3: solo si tiene nombre real distinto al anterior y valores distintos a los de attr1
    const lowerSet1 = new Set(values1.map(v => v.toLowerCase()))
    if (attr2Name && attr2Name !== attr1Name && values2.length > 0) {
      const distinctValues2 = values2.filter(v => !lowerSet1.has(v.toLowerCase()))
      if (distinctValues2.length > 0) attributes[attr2Name] = distinctValues2
    }
    const lowerSet2 = new Set(values2.map(v => v.toLowerCase()))
    if (attr3Name && attr3Name !== attr1Name && attr3Name !== attr2Name && values3.length > 0) {
      const distinctValues3 = values3.filter(v => !lowerSet1.has(v.toLowerCase()) && !lowerSet2.has(v.toLowerCase()))
      if (distinctValues3.length > 0) attributes[attr3Name] = distinctValues3
    }

    return {
      externalId,
      name,
      description,
      price,
      sku,
      stock,
      isActive,
      category: {
        externalId: categoryExternalId,
        name: categoryName,
      },
      imageUrls,
      attributes,
    }
  }

  private async upsertProductFromZecat(
    productFromApi: ZecatProduct,
    priceFactor: Prisma.Decimal,
  ) {
    const norm = this.normalizeFromApi(productFromApi)

    if (!norm.externalId) {
      this.logger.warn(
        '[upsertProductFromZecat] Producto sin externalId, se omite',
      )
      return
    }

    // Convertimos Decimal -> number para guardar un campo Float
    const factorNumber = Number(priceFactor)

    const rawFinalPrice = norm.price * factorNumber
    const finalPrice = this.roundTo2(rawFinalPrice)

    const categoryRel: Prisma.ProductCreateInput['category'] = {
      connectOrCreate: {
        where: { externalId: norm.category.externalId },
        create: {
          name: norm.category.name,
          imageUrl: '',
          externalId: norm.category.externalId,
          source: Source.ZECAT,
        },
      },
    }

    const createData: Prisma.ProductCreateInput = {
      name: norm.name,
      description: norm.description,
      price: finalPrice,
      category: categoryRel,
      stock: norm.stock,
      isActive: norm.isActive,
      sku: norm.sku,
      externalId: norm.externalId,
      source: Source.ZECAT,
    }

    const updateData: Prisma.ProductUpdateInput = {
      name: norm.name,
      description: norm.description,
      price: finalPrice,
      stock: norm.stock,
      isActive: norm.isActive,
      sku: norm.sku,
      source: Source.ZECAT,
      updatedAt: new Date(),
      category: categoryRel,
    }

    const product = await this.prisma.product.upsert({
      where: { externalId: norm.externalId },
      create: createData,
      update: updateData,
      include: {
        images: true,
        variants: { include: { options: true } },
      },
    })

    if (norm.imageUrls.length) {
      const existing = new Set(product.images.map((i) => i.url))
      const toCreate = norm.imageUrls
        .map(u => String(u).trim())
        .filter((u) => u.length > 0 && !existing.has(u))

      if (toCreate.length) {
        await this.prisma.productImage.createMany({
          data: toCreate.map((url) => ({ productId: product.id, url })),
          skipDuplicates: true,
        })
      }
    }

    // Técnicas de impresión
    const printingTypesRaw: any[] = Array.isArray((productFromApi as any).printing_types)
      ? (productFromApi as any).printing_types
      : []

    for (const pt of printingTypesRaw) {
      const extId = String(pt.id ?? '')
      if (!extId) continue
      await this.prisma.printingType.upsert({
        where: { productId_externalId: { productId: product.id, externalId: extId } },
        create: {
          productId: product.id,
          externalId: extId,
          name: pt.name ?? 'Técnica',
          setupPrice: Number(pt.setup_price ?? 0),
          unitPrice: Number(pt.unit_price ?? 0),
          minUnits: Number(pt.min_units_for_printing ?? 1) || 1,
          baseTime: Number(pt.base_time ?? 0),
          occupation: Number(pt.ocupation ?? 0),
          dayFactor: Number(pt.day_factor ?? 0),
        },
        update: {
          name: pt.name ?? 'Técnica',
          setupPrice: Number(pt.setup_price ?? 0),
          unitPrice: Number(pt.unit_price ?? 0),
          minUnits: Number(pt.min_units_for_printing ?? 1) || 1,
          baseTime: Number(pt.base_time ?? 0),
          occupation: Number(pt.ocupation ?? 0),
          dayFactor: Number(pt.day_factor ?? 0),
        },
      })
    }

    // Variantes: borrar todas y recrear desde cero para mantener sincronía con Zecat
    await this.prisma.variantOption.deleteMany({
      where: { variant: { productId: product.id } },
    })
    await this.prisma.variant.deleteMany({
      where: { productId: product.id },
    })

    for (const [attrName, rawValues] of Object.entries(norm.attributes)) {
      const variantName = String(attrName).trim()
      if (!variantName || !Array.isArray(rawValues) || rawValues.length === 0) continue

      const values = (rawValues as string[])
        .map((v) => String(v ?? '').trim())
        .filter((v) => v.length > 0)

      if (!values.length) continue

      const variant = await this.prisma.variant.create({
        data: { productId: product.id, name: variantName },
      })

      await this.prisma.variantOption.createMany({
        data: values.map((value) => ({ variantId: variant.id, value })),
        skipDuplicates: true,
      })
    }
  }

  // helper seguro por si falla la config
  private async getPriceFactorSafe(): Promise<Prisma.Decimal> {
    try {
      return await this.pricingConfig.getPriceFactorWithIva()
    } catch (error) {
      this.logger.error(
        '[PricingConfig] No se pudo obtener factor de precio, usando 1.21 (solo IVA)',
        error as any,
      )
      // fallback: solo IVA 21%
      return new Prisma.Decimal(1.21)
    }
  }

  async syncCategoriesAndProductsFast() {
    this.logger.log('[fastSync] Sincronizando categorías…')
    await this.syncCategories()
    this.logger.log('[fastSync] Sincronizando productos (rápido)…')
    await this.syncProductsFast()
    this.logger.log('[fastSync] OK')
  }

  async fullSync() {
    this.logger.log('Sincronizando categorías…')
    await this.syncCategories()
    this.logger.log('Sincronizando productos (completo)…')
    await this.syncProducts()
    this.logger.log('OK')
  }
}

