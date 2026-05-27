import { Controller, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { ImpromSyncService } from './improm.sync.service'
import { PricingConfigService } from '../pricing-config/pricing-config.service'

@Controller('admin/improm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ImpromAdminController {
  constructor(
    private readonly impromSync: ImpromSyncService,
    private readonly pricingConfig: PricingConfigService,
  ) {}

  @Post('sync')
  async sync() {
    await this.impromSync.syncProducts()
    await this.pricingConfig.updateSyncTimestamp('improm')
    return { ok: true, message: 'Sincronización Improm completada' }
  }
}
