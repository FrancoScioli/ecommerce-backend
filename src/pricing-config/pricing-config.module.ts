import { Module } from '@nestjs/common'
import { PricingConfigService } from './pricing-config.service'
import { PricingConfigController } from './pricing-config.controller'
import { HomeDataController } from './home-data.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
    controllers: [PricingConfigController, HomeDataController],
    providers: [PricingConfigService, PrismaService],
    exports: [PricingConfigService],
})
export class PricingConfigModule { }
