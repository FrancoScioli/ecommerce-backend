import { Controller, Get } from '@nestjs/common'
import { PricingConfigService } from './pricing-config.service'

@Controller('public')
export class HomeDataController {
  constructor(private readonly pricingConfigService: PricingConfigService) {}

  @Get('home-data')
  getHomeData() {
    return this.pricingConfigService.getHomeData()
  }

  @Get('legends')
  async getLegends() {
    const config = await this.pricingConfigService.getConfig()
    return {
      legendUsdPrice: config.legendUsdPrice ?? '',
      legendImpromPersonal: config.legendImpromPersonal ?? '',
    }
  }
}
