import { PartialType } from '@nestjs/mapped-types'
import { CreateProductDto } from './create-product.dto'
import { IsOptional, IsString, IsInt, IsBoolean, IsArray, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateProductDto extends PartialType(CreateProductDto) {
  // categoryIds queda como opcional al extender PartialType(CreateProductDto),
  // pero lo redeclaramos explícitamente para mayor claridad en la API.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  categoryIds?: number[]

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
