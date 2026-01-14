import { Module } from '@nestjs/common'
import { PricingConfigService } from './pricing-config.service'
import { PricingConfigController } from './pricing-config.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
    controllers: [PricingConfigController],
    providers: [PricingConfigService, PrismaService],
    exports: [PricingConfigService],
})
export class PricingConfigModule { }
