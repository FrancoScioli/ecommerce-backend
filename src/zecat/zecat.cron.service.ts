import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ZecatSyncService } from './zecat.sync.service'
import { PricingConfigService } from '../pricing-config/pricing-config.service'

@Injectable()
export class ZecatCronService {
  private readonly logger = new Logger(ZecatCronService.name)
  private lastRunAt: Date | null = null

  constructor(
    private readonly zecatSync: ZecatSyncService,
    private readonly pricingConfig: PricingConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync() {
    const config = await this.pricingConfig.getConfig()
    const intervalHours = config.zecatSyncIntervalHours ?? 1

    if (this.lastRunAt) {
      const elapsedMs = Date.now() - this.lastRunAt.getTime()
      const elapsedHours = elapsedMs / (1000 * 60 * 60)
      if (elapsedHours < intervalHours) {
        this.logger.debug(
          `Zecat sync skipped — ${elapsedHours.toFixed(2)}h elapsed, interval is ${intervalHours}h`,
        )
        return
      }
    }

    this.logger.log(`Zecat auto-sync started (interval: ${intervalHours}h)`)
    this.lastRunAt = new Date()

    try {
      await this.zecatSync.fullSync()
      this.logger.log('Zecat auto-sync done')
    } catch (err) {
      this.logger.error('Zecat auto-sync failed', err)
    }
  }
}
