import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { PricingConfigModule } from '../pricing-config/pricing-config.module'
import { ImpromService } from './improm.service'
import { ImpromSyncService } from './improm.sync.service'
import { ImpromCronService } from './improm.cron.service'
import { ImpromAdminController } from './improm.admin.controller'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PricingConfigModule,
    HttpModule.register({
      baseURL: 'https://promoproductos.com',
      timeout: 60000,
      headers: {
        Authorization: `Basic ${Buffer.from('Caro Alayon:d6bfd12c78b6345acbb6b0a640d7b5f98ac812f1').toString('base64')}`,
      },
    }),
  ],
  controllers: [ImpromAdminController],
  providers: [ImpromService, ImpromSyncService, ImpromCronService],
  exports: [ImpromSyncService],
})
export class ImpromModule {}
