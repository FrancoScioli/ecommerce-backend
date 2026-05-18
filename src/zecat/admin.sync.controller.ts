import { Controller, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { ZecatSyncService } from './zecat.sync.service'
import { PricingConfigService } from '../pricing-config/pricing-config.service'

@Controller('admin/zecat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminZecatSyncController {
  constructor(
    private readonly zecatSync: ZecatSyncService,
    private readonly pricingConfig: PricingConfigService,
  ) {}

  @Post('sync')
  async sync(@Query('scope') scope: 'all' | 'categories' | 'products' | 'fast' = 'all') {
    if (scope === 'categories') {
      await this.zecatSync.syncCategories()
    } else if (scope === 'products') {
      await this.zecatSync.syncProducts()
      await this.pricingConfig.updateSyncTimestamp('detail')
    } else if (scope === 'fast') {
      await this.zecatSync.syncCategoriesAndProductsFast()
      await this.pricingConfig.updateSyncTimestamp('fast')
    } else {
      await this.zecatSync.fullSync()
      await this.pricingConfig.updateSyncTimestamp('fast')
      await this.pricingConfig.updateSyncTimestamp('detail')
    }
    return { ok: true, message: `Sync ${scope} disparado` }
  }
}
