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

  async syncProducts() {
    let page = 1
    const pageSize = Number(process.env.ZECAT_SYNC_PAGE_SIZE ?? 100)

    // Factor total = (1 + markup/100) * 1.21 IVA
    const priceFactor = await this.getPriceFactorSafe()
    this.logger.log(
      `[syncProducts] Usando factor total de precio (markup + IVA): ${priceFactor.toString()}`,
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

    const colors = uniqueValues('element_description_1')
    const sizes = uniqueValues('element_description_2')
    const thirds = uniqueValues('element_description_3')

    if (colors.length > 0) attributes['Color'] = colors
    if (sizes.length > 0) attributes['Talle'] = sizes
    if (thirds.length > 0) attributes['Variante'] = thirds

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

    // Variantes (atributos)
    for (const [attrName, rawValues] of Object.entries(norm.attributes)) {
      const variantName = String(attrName).trim()
      if (!variantName || !Array.isArray(rawValues) || rawValues.length === 0)
        continue

      let variantId: number
      const existingVariant = product.variants.find(
        (v) => v.name === variantName,
      )
      if (existingVariant) {
        variantId = existingVariant.id
      } else {
        const created = await this.prisma.variant.create({
          data: { productId: product.id, name: variantName },
        })
        variantId = created.id
      }

      const existingOptions = await this.prisma.variantOption.findMany({
        where: { variantId },
        select: { value: true },
      })
      const existingSet = new Set(
        existingOptions.map((o) => o.value.trim().toLowerCase()),
      )

      const valuesToCreate = (rawValues as string[])
        .map((v) => String(v ?? '').trim())
        .filter((v) => v.length > 0 && !existingSet.has(v.toLowerCase()))

      if (valuesToCreate.length) {
        await this.prisma.variantOption.createMany({
          data: valuesToCreate.map((value) => ({ variantId, value })),
          skipDuplicates: true,
        })
      }
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

  async fullSync() {
    this.logger.log('Sincronizando categorías…')
    await this.syncCategories()
    this.logger.log('Sincronizando productos…')
    await this.syncProducts()
    this.logger.log('OK')
  }
}

