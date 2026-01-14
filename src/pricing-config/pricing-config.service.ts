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

  /**
   * Actualiza el porcentaje de recargo global.
   */
  async updateConfig(dto: UpdatePricingConfigDto) {
    const markup = new Prisma.Decimal(dto.providerMarkupPercent)

    const config = await this.prisma.pricingConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        providerMarkupPercent: markup,
      },
      update: {
        providerMarkupPercent: markup,
      },
    })

    this.logger.log(
      `[updateConfig] Nuevo recargo proveedor: ${config.providerMarkupPercent.toString()}%`,
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
}
