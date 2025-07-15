import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VariantOptionsService } from './variant-options.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateVariantOptionDto } from './dto/create-variant-option.dto';

@Controller('variant-options')
export class VariantOptionsController {
  constructor(private readonly variantOptionsService: VariantOptionsService) {}
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateVariantOptionDto) {
    return this.variantOptionsService.create(dto);
  }
}
