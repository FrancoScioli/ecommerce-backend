import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ImpromSyncService } from './improm.sync.service'
import { PricingConfigService } from '../pricing-config/pricing-config.service'

@Injectable()
export class ImpromCronService {
  private readonly logger = new Logger(ImpromCronService.name)

  constructor(
    private readonly impromSync: ImpromSyncService,
    private readonly pricingConfig: PricingConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync() {
    const config = await this.pricingConfig.getConfig()
    const intervalHours = config.impromSyncIntervalHours ?? 24

    if (config.impromLastSyncAt) {
      const elapsed = (Date.now() - config.impromLastSyncAt.getTime()) / (1000 * 60 * 60)
      if (elapsed < intervalHours) {
        this.logger.debug(`[impromCron] Skipped — ${elapsed.toFixed(2)}h elapsed, interval is ${intervalHours}h`)
        return
      }
    }

    this.logger.log(`[impromCron] Iniciando (intervalo: ${intervalHours}h)`)
    await this.pricingConfig.updateSyncTimestamp('improm')

    try {
      await this.impromSync.syncProducts()
      this.logger.log('[impromCron] Completado')
    } catch (err) {
      this.logger.error('[impromCron] Error', err)
    }
  }
}
