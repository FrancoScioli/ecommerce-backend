import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ZecatSyncService } from './zecat.sync.service'
import { PricingConfigService } from '../pricing-config/pricing-config.service'

@Injectable()
export class ZecatCronService {
  private readonly logger = new Logger(ZecatCronService.name)
  private lastFastRunAt: Date | null = null
  private lastDetailRunAt: Date | null = null

  constructor(
    private readonly zecatSync: ZecatSyncService,
    private readonly pricingConfig: PricingConfigService,
  ) {}

  // Categorías + productos genéricos: corre cada hora, respeta el intervalo configurado.
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledFastSync() {
    const config = await this.pricingConfig.getConfig()
    const intervalHours = config.zecatSyncIntervalHours ?? 1

    if (this.lastFastRunAt) {
      const elapsedHours = (Date.now() - this.lastFastRunAt.getTime()) / (1000 * 60 * 60)
      if (elapsedHours < intervalHours) {
        this.logger.debug(
          `[fastSync] Skipped — ${elapsedHours.toFixed(2)}h elapsed, interval is ${intervalHours}h`,
        )
        return
      }
    }

    this.logger.log(`[fastSync] Iniciando (intervalo: ${intervalHours}h)`)
    this.lastFastRunAt = new Date()

    try {
      await this.zecatSync.syncCategoriesAndProductsFast()
      this.logger.log('[fastSync] Completado')
    } catch (err) {
      this.logger.error('[fastSync] Error', err)
    }
  }

  // Personalización (detalle por producto): corre cada hora pero solo ejecuta
  // si el horario actual está dentro de la ventana configurada (23 hs a 6 hs).
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledDetailSync() {
    const config = await this.pricingConfig.getConfig()
    const startHour = config.zecatDetailSyncHour ?? 23

    const now = new Date()
    const currentHour = now.getHours()

    // Ventana: desde startHour hasta las 6 hs (inclusive)
    const inWindow =
      currentHour >= startHour || currentHour < 6

    if (!inWindow) {
      this.logger.debug(
        `[detailSync] Skipped — hora actual ${currentHour}h fuera de ventana (${startHour}h–6h)`,
      )
      return
    }

    // Evitar que corra más de una vez en la misma ventana nocturna
    if (this.lastDetailRunAt) {
      const elapsedHours = (Date.now() - this.lastDetailRunAt.getTime()) / (1000 * 60 * 60)
      if (elapsedHours < 20) {
        this.logger.debug(
          `[detailSync] Skipped — ya corrió hace ${elapsedHours.toFixed(2)}h`,
        )
        return
      }
    }

    this.logger.log(`[detailSync] Iniciando sync completo (hora: ${currentHour}h)`)
    this.lastDetailRunAt = new Date()

    try {
      await this.zecatSync.fullSync()
      this.logger.log('[detailSync] Completado')
    } catch (err) {
      this.logger.error('[detailSync] Error', err)
    }
  }
}
