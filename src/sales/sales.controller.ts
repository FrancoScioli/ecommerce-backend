import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SalesService, PlaceOrderDto } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.salesService.findAllWithUser();
  }

  @Post('place-order')
  placeOrder(@Body() dto: PlaceOrderDto) {
    return this.salesService.placeOrder(dto);
  }

  @Post('secure-create')
  async secureCreate(@Body() dto: CreateSaleDto) {
    return this.salesService.secureCreate(dto);
  }

  @Get('user/:userId')
  async getByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.salesService.findByUser(userId);
  }
}
