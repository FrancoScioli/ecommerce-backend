import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { ZecatService } from './zecat.service'
import { ZecatSyncService } from './zecat.sync.service'
import { AdminZecatSyncController } from './admin.sync.controller'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
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
