import { Controller, Get } from '@nestjs/common'
import { PricingConfigService } from './pricing-config.service'

@Controller('public/home-data')
export class HomeDataController {
  constructor(private readonly pricingConfigService: PricingConfigService) {}

  @Get()
  getHomeData() {
    return this.pricingConfigService.getHomeData()
  }
}
