import { Injectable, Logger } from '@nestjs/common'
import { Prisma, Source } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ImpromService } from './improm.service'
import { PricingConfigService } from '../pricing-config/pricing-config.service'

const IMPROM_CATEGORY_NAME = 'Línea Premium'
const IVA_FACTOR = new Prisma.Decimal('1.21')

@Injectable()
export class ImpromSyncService {
  private readonly logger = new Logger(ImpromSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly improm: ImpromService,
    private readonly pricingConfig: PricingConfigService,
  ) {}

  async syncProducts() {
    this.logger.log('[impromSync] Iniciando sincronización…')

    const config = await this.pricingConfig.getConfig()
    const markupPercent = config.impromMarkupPercent ?? new Prisma.Decimal(0)
    // factor = (1 + markup/100) * 1.21
    const priceFactor = new Prisma.Decimal(1)
      .add(markupPercent.div(100))
      .mul(IVA_FACTOR)

    this.logger.log(`[impromSync] Factor de precio: ${priceFactor.toString()}`)

    // Asegurar que exista la categoría "Línea Premium"
    const category = await this.prisma.category.upsert({
      where: { externalId: 'IMPROM_PREMIUM' },
      create: {
        name: IMPROM_CATEGORY_NAME,
        imageUrl: '',
        externalId: 'IMPROM_PREMIUM',
        source: Source.IMPROM,
      },
      update: {},
    })

    const products = await this.improm.getCatalog()
    this.logger.log(`[impromSync] ${products.length} productos recibidos`)

    for (const p of products) {
      try {
        await this.upsertProduct(p, category.id, priceFactor)
      } catch (err) {
        this.logger.error(`[impromSync] Error en producto ${p?.root}`, err)
      }
    }

    this.logger.log('[impromSync] Completado')
  }

  private roundTo2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  private async upsertProduct(raw: any, categoryId: number, priceFactor: Prisma.Decimal) {
    const externalId = String(raw.root ?? '').trim()
    if (!externalId) return

    // Precio base sin IVA desde la API (la API ya incluye tax=21, así que dividimos)
    const priceWithTaxUsd = Number(raw.price ?? 0)
    const priceBaseUsd = priceWithTaxUsd / 1.21
    const finalPrice = this.roundTo2(priceBaseUsd * Number(priceFactor))

    const name = String(raw.name ?? '').trim() || 'Producto'
    const description = String(raw.description ?? '').trim()
    const sku = raw.products?.[0]?.sku ? String(raw.products[0].sku) : null

    // Stock total sumando todos los items de products[]
    const productsArr: any[] = Array.isArray(raw.products) ? raw.products : []
    const totalStock = productsArr.reduce((acc: number, item: any) => acc + (Number(item.stock) || 0), 0)
    const stock = totalStock > 0 ? totalStock : null

    // Imágenes: root_pictures es array de strings, pictures es array de objetos {media}
    const extractUrls = (arr: any[]): string[] =>
      arr.map((img: any) =>
        typeof img === 'string' ? img.trim() : String(img?.media ?? img?.url ?? '').trim()
      ).filter(Boolean)

    const rootPics = Array.isArray(raw.root_pictures) ? raw.root_pictures : []
    const pics = Array.isArray(raw.pictures) ? raw.pictures : []
    const allUrls = [...extractUrls(rootPics), ...extractUrls(pics)]
    const imageUrls: string[] = [...new Set(allUrls)]

    const product = await this.prisma.product.upsert({
      where: { externalId },
      create: {
        name,
        description,
        price: finalPrice,
        categoryId,
        externalId,
        source: Source.IMPROM,
        sku,
        stock,
        isActive: true,
      },
      update: {
        name,
        description,
        price: finalPrice,
        categoryId,
        sku,
        stock,
        source: Source.IMPROM,
        updatedAt: new Date(),
      },
      include: { images: true, variants: { include: { options: true } } },
    })

    // Imágenes: agregar las nuevas
    if (imageUrls.length) {
      const existing = new Set(product.images.map((i) => i.url))
      const toCreate = imageUrls.filter((u) => !existing.has(u))
      if (toCreate.length) {
        await this.prisma.productImage.createMany({
          data: toCreate.map((url) => ({ productId: product.id, url })),
          skipDuplicates: true,
        })
      }
    }

    // Variantes desde products[].attribute_1 / attribute_1_val / attribute_2 / attribute_2_val
    const attrMap: Record<string, Set<string>> = {}
    for (const item of productsArr) {
      const a1 = String(item.attribute_1 ?? '').trim()
      const v1 = String(item.attribute_1_val ?? '').trim()
      const a2 = String(item.attribute_2 ?? '').trim()
      const v2 = String(item.attribute_2_val ?? '').trim()

      if (a1 && v1) {
        if (!attrMap[a1]) attrMap[a1] = new Set()
        attrMap[a1].add(v1)
      }
      if (a2 && v2) {
        if (!attrMap[a2]) attrMap[a2] = new Set()
        attrMap[a2].add(v2)
      }
    }

    if (Object.keys(attrMap).length > 0) {
      await this.prisma.variantOption.deleteMany({ where: { variant: { productId: product.id } } })
      await this.prisma.variant.deleteMany({ where: { productId: product.id } })

      for (const [attrName, valuesSet] of Object.entries(attrMap)) {
        const values = [...valuesSet]
        const variant = await this.prisma.variant.create({
          data: { productId: product.id, name: attrName },
        })
        await this.prisma.variantOption.createMany({
          data: values.map((value) => ({ variantId: variant.id, value })),
          skipDuplicates: true,
        })
      }
    }
  }
}
