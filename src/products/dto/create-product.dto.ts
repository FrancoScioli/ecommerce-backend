import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsArray
} from 'class-validator'
import { Type } from 'class-transformer'
import { CreateVariantDto } from './create-variant.dto'

export class CreateProductDto {
  @IsString() name: string

  @IsString() description: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid number with up to 2 decimals' })
  @Min(0.01, { message: 'price must not be less than 0.01' })
  price: number

  @Type(() => Number)
  @IsInt({ message: 'categoryId must be an integer number' })
  categoryId: number

  @IsOptional()
  @IsArray({ message: 'variants must be an array' })
  @ValidateNested({ each: true, message: 'each value in nested property variants must be an object conforming to CreateVariantDto' })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[]
}
