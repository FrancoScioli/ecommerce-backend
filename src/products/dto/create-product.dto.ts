import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsArray,
  ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CreateVariantDto } from './create-variant.dto'

export class CreateProductDto {
  @IsString()
  name: string

  @IsString()
  description: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid number with up to 2 decimals' })
  @Min(0.01, { message: 'price must not be less than 0.01' })
  price: number

  /**
   * IDs de las categorías a las que pertenece el producto.
   * Se reemplaza categoryId (singular) por categoryIds (array) para soportar
   * la relación many-to-many entre Product y Category.
   */
  @IsArray({ message: 'categoryIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one category is required' })
  @IsInt({ each: true, message: 'Each categoryId must be an integer' })
  @Type(() => Number)
  categoryIds: number[]

  @IsOptional()
  @IsArray({ message: 'variants must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[]
}
