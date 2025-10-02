import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ZecatSyncService } from './zecat.sync.service'

@Injectable()
export class ZecatCronService {
  private readonly logger = new Logger(ZecatCronService.name)
  constructor(private readonly zecatSync: ZecatSyncService) {}

  // Full sync diario 03:00
  @Cron('0 3 * * *')
  async nightly() {
    this.logger.log('Cron Zecat nightly started')
    await this.zecatSync.fullSync()
    this.logger.log('Cron Zecat nightly done')
  }

  // Refresco liviano cada hora (productos: stock/precio)
  @Cron(CronExpression.EVERY_HOUR)
  async hourly() {
    await this.zecatSync.syncProducts()
  }
}
