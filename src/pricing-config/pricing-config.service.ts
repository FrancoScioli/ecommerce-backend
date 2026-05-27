import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { UpdatePricingConfigDto } from './dto/update-pricing-config.dto'

const IVA_PERCENT = new Prisma.Decimal(21) // 21%

@Injectable()
export class PricingConfigService {
  private readonly logger = new Logger(PricingConfigService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve la fila de configuración, creándola si no existe.
   */
  async getConfig() {
    let config = await this.prisma.pricingConfig.findUnique({
      where: { id: 1 },
    })

    if (!config) {
      this.logger.log('[getConfig] No existía config, creando default (0% markup)')

      config = await this.prisma.pricingConfig.create({
        data: {
          id: 1,
          providerMarkupPercent: new Prisma.Decimal(0),
        },
      })
    }

    return config
  }

  async updateConfig(dto: UpdatePricingConfigDto) {
    const updateData: Prisma.PricingConfigUpdateInput = {}
    const createData: Prisma.PricingConfigCreateInput = { id: 1, providerMarkupPercent: new Prisma.Decimal(0) }

    if (dto.providerMarkupPercent !== undefined) {
      updateData.providerMarkupPercent = new Prisma.Decimal(dto.providerMarkupPercent)
      createData.providerMarkupPercent = new Prisma.Decimal(dto.providerMarkupPercent)
    }
    if (dto.zecatSyncIntervalHours !== undefined) {
      updateData.zecatSyncIntervalHours = dto.zecatSyncIntervalHours
      createData.zecatSyncIntervalHours = dto.zecatSyncIntervalHours
    }
    if (dto.zecatDetailSyncHour !== undefined) {
      updateData.zecatDetailSyncHour = dto.zecatDetailSyncHour
      createData.zecatDetailSyncHour = dto.zecatDetailSyncHour
    }
    if (dto.salesEmail !== undefined) {
      updateData.salesEmail = dto.salesEmail
      createData.salesEmail = dto.salesEmail
    }
    if (dto.featuredCategoryIds !== undefined) {
      updateData.featuredCategoryIds = dto.featuredCategoryIds
      createData.featuredCategoryIds = dto.featuredCategoryIds
    }
    if (dto.featuredProductIds !== undefined) {
      updateData.featuredProductIds = dto.featuredProductIds
      createData.featuredProductIds = dto.featuredProductIds
    }
    if (dto.impromMarkupPercent !== undefined) {
      updateData.impromMarkupPercent = new Prisma.Decimal(dto.impromMarkupPercent)
      createData.impromMarkupPercent = new Prisma.Decimal(dto.impromMarkupPercent)
    }
    if (dto.impromSyncIntervalHours !== undefined) {
      updateData.impromSyncIntervalHours = dto.impromSyncIntervalHours
      createData.impromSyncIntervalHours = dto.impromSyncIntervalHours
    }
    if (dto.legendUsdPrice !== undefined) {
      updateData.legendUsdPrice = dto.legendUsdPrice
      createData.legendUsdPrice = dto.legendUsdPrice
    }
    if (dto.legendImpromPersonal !== undefined) {
      updateData.legendImpromPersonal = dto.legendImpromPersonal
      createData.legendImpromPersonal = dto.legendImpromPersonal
    }

    const config = await this.prisma.pricingConfig.upsert({
      where: { id: 1 },
      create: createData,
      update: updateData,
    })

    this.logger.log(
      `[updateConfig] markup=${config.providerMarkupPercent}% syncInterval=${config.zecatSyncIntervalHours}h`,
    )

    return config
  }

  /**
   * Factor de markup:
   *  - markup 0%  -> 1.00
   *  - markup 10% -> 1.10
   */
  async getMarkupFactor(): Promise<Prisma.Decimal> {
    const config = await this.getConfig()
    const percent = config.providerMarkupPercent // ej: 10

    const factor = new Prisma.Decimal(1).add(percent.div(100))

    return factor
  }

  /**
   * Factor de IVA (fijo 21%):
   *  - 21% -> 1.21
   */
  getIvaFactor(): Prisma.Decimal {
    return new Prisma.Decimal(1).add(IVA_PERCENT.div(100))
  }

  /**
   * Factor total a aplicar al precio del proveedor:
   *   precioFinal = precioBase * (1 + markup/100) * 1.21
   */
  async getPriceFactorWithIva(): Promise<Prisma.Decimal> {
    const markupFactor = await this.getMarkupFactor()
    const ivaFactor = this.getIvaFactor()

    return markupFactor.mul(ivaFactor)
  }

  async updateSyncTimestamp(type: 'fast' | 'detail' | 'improm') {
    const field =
      type === 'fast' ? 'zecatLastFastSyncAt' :
      type === 'detail' ? 'zecatLastDetailSyncAt' :
      'impromLastSyncAt'
    await this.prisma.pricingConfig.upsert({
      where: { id: 1 },
      create: { id: 1, providerMarkupPercent: new Prisma.Decimal(0), [field]: new Date() },
      update: { [field]: new Date() },
    })
  }

  async getHomeData() {
    const config = await this.getConfig()
    const categoryIds: number[] = Array.isArray(config.featuredCategoryIds) ? config.featuredCategoryIds as number[] : []
    const productIds: number[] = Array.isArray(config.featuredProductIds) ? config.featuredProductIds as number[] : []

    const [categories, products] = await Promise.all([
      categoryIds.length > 0
        ? this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, imageUrl: true },
          })
        : [],
      productIds.length > 0
        ? this.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            select: {
              id: true,
              name: true,
              price: true,
              coverImageId: true,
              images: { select: { id: true, url: true } },
            },
          })
        : [],
    ])

    // Preserve the admin-defined order
    const orderedCategories = categoryIds
      .map((id) => (categories as any[]).find((c) => c.id === id))
      .filter(Boolean)
    const orderedProducts = productIds
      .map((id) => (products as any[]).find((p) => p.id === id))
      .filter(Boolean)
      .map((p: any) => {
        if (p.coverImageId && Array.isArray(p.images)) {
          p.images = [...p.images].sort((a: any, b: any) =>
            a.id === p.coverImageId ? -1 : b.id === p.coverImageId ? 1 : 0
          )
        }
        return p
      })

    return { categories: orderedCategories, products: orderedProducts }
  }
}
