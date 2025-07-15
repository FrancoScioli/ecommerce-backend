import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) { }

  @Get()
  findAll() {
    return this.salesService.findAllWithUser();
  }

  @Post("secure-create")
  async secureCreate(@Body() dto: CreateSaleDto) {
    return this.salesService.secureCreate(dto);
  }

  @Get("user/:userId")
  async getByUser(@Param("userId", ParseIntPipe) userId: number) {
    return this.salesService.findByUser(userId);
  }
}
