import { Injectable, Logger } from '@nestjs/common'
import { Prisma, Source } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ZecatService } from './zecat.service'
import { ZecatProduct, ZecatProductList } from './zecat.types'

@Injectable()
export class ZecatSyncService {
  private readonly logger = new Logger(ZecatSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly zecat: ZecatService,
  ) { }

  async syncCategories() {
    const resp = await this.zecat.listCategories();
    const cats = Array.isArray(resp) ? resp : resp.families;
    if (!Array.isArray(cats)) {
      this.logger.error('[syncCategories] Respuesta inesperada de categorías', { resp });
      return;
    }

    for (const cat of cats) {
      await this.prisma.category.upsert({
        where: { externalId: String(cat.id) },
        update: {
          name: cat.title ?? cat.name ?? 'Sin categoría',
          imageUrl: cat.icon_url ?? cat.icon_active_url ?? '',
          source: Source.ZECAT,
          updatedAt: new Date(),
        },
        create: {
          name: cat.title ?? cat.name ?? 'Sin categoría',
          imageUrl: cat.icon_url ?? cat.icon_active_url ?? '',
          externalId: String(cat.id),
          source: Source.ZECAT,
        },
      });
    }
  }

  async syncProducts() {
    let page = 1
    const pageSize = Number(process.env.ZECAT_SYNC_PAGE_SIZE ?? 100)

    while (true) {
      const list: any = await this.zecat.listProducts(page, pageSize)

      const itemsRaw = (list as any)?.genericProducts ?? (list as any)?.generic_products
      const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : []

      if (items.length === 0) break

      for (const productFromApi of items) {
        await this.upsertProductFromZecat(productFromApi)
      }

      if (items.length < pageSize) break
      page++
    }
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

    const description =
      (productFromApi as any).description ?? ''

    const price = Number(
      (productFromApi as any).price ??
      (productFromApi as any).finalPrice ??
      0
    )

    const sku =
      (productFromApi as any).sku
        ? String((productFromApi as any).sku)
        : null

    const stockRaw =
      (productFromApi as any).stock ??
      (productFromApi as any).available ??
      null

    const stock =
      typeof stockRaw === 'number'
        ? stockRaw
        : stockRaw === true
          ? 1
          : null

    const isActive = (stock ?? 0) > 0

    const famArr = Array.isArray((productFromApi as any).families)
      ? (productFromApi as any).families
      : []

    const fam = famArr.length ? famArr[0] : null

    const categoryExternalId = fam?.id != null
      ? String(fam.id)
      : 'UNCATEGORIZED'

    const categoryName =
      (fam?.title ?? fam?.name ?? 'Sin categoría')

    const imageUrls: string[] = Array.isArray((productFromApi as any).images)
      ? (productFromApi as any).images
        .map((img: any) => img?.image_url ?? img?.url ?? '')
        .filter((u: string) => !!u)
      : ((productFromApi as any).image
        ? [String((productFromApi as any).image)]
        : [])

    const attributes =
      (productFromApi as any).attributes ?? {}

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




  private async upsertProductFromZecat(productFromApi: ZecatProduct) {
    const norm = this.normalizeFromApi(productFromApi)

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
      price: norm.price,
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
      price: norm.price,
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
      const existingVariant = product.variants.find((v) => v.name === variantName)
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

  async fullSync() {
    this.logger.log('Sincronizando categorías…')
    await this.syncCategories()
    this.logger.log('Sincronizando productos…')
    await this.syncProducts()
    this.logger.log('OK')
  }
}
