import { Controller, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { ZecatSyncService } from './zecat.sync.service'

@Controller('admin/zecat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminZecatSyncController {
  constructor(private readonly zecatSync: ZecatSyncService) {}

  @Post('sync')
  async sync(@Query('scope') scope: 'all' | 'categories' | 'products' = 'all') {
    if (scope === 'categories') await this.zecatSync.syncCategories()
    else if (scope === 'products') await this.zecatSync.syncProducts()
    else await this.zecatSync.fullSync()
    return { ok: true, message: `Sync ${scope} disparado` }
  }
}
