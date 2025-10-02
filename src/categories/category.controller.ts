import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CategoryService } from './category.service';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Get()
  findAll(
    @Query('hideEmpty') hideEmpty?: string,
    @Query('onlyActive') onlyActive?: string,
    @Query('withCounts') withCounts?: string,
    @Query('minProducts') minProducts?: string,
  ) {
    return this.categoryService.findAll({
      hideEmpty: hideEmpty === 'true',
      onlyActiveProducts: onlyActive === 'true',
      withCounts: withCounts === 'true',
      minProducts: minProducts ? Number(minProducts) : undefined,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('withProducts') withProducts?: string,
    @Query('onlyActive') onlyActive?: string,
    @Query('withCounts') withCounts?: string,
  ) {
    return this.categoryService.findOne(id, {
      withProducts: withProducts === 'true',
      onlyActiveProducts: onlyActive !== 'false',
      withCounts: withCounts === 'true',
    });
  }
}
