import { PartialType } from '@nestjs/mapped-types'
import { CreateProductDto } from './create-product.dto'
import { IsOptional, IsString, IsInt, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsString()
  sku?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stock?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
