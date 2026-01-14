import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { ZecatService } from './zecat.service'
import { ZecatSyncService } from './zecat.sync.service'
import { AdminZecatSyncController } from './admin.sync.controller'
import { PricingConfigModule } from 'src/pricing-config/pricing-config.module'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PricingConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule, PricingConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        baseURL: cfg.get<string>('ZECAT_BASE_URL'),
        timeout: 60000,
        headers: {
          Authorization: `Bearer ${cfg.get<string>('ZECAT_API_TOKEN')}`,
          'Content-Type': 'application/json',
        },
      }),
    }),
  ],
  controllers: [AdminZecatSyncController],
  providers: [ZecatService, ZecatSyncService],
  exports: [ZecatService, ZecatSyncService],
})
export class ZecatModule { }
