import { Controller, Post, Body, Get } from '@nestjs/common'
import { ShippingService } from './shipping.service'

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) { }

  @Get('methods')
  getMethods() {
    return this.shippingService.getShippingMethods()
  }

  @Post('estimate')
  estimate(@Body() dto: { address: string; postalCode?: string }) {
    return this.shippingService.estimateCost(dto.address, dto.postalCode)
  }
}
