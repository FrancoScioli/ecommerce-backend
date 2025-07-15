import { IsInt, Min, IsString, IsNotEmpty } from 'class-validator';

export class CreateVariantOptionDto {
  @IsInt()
  @Min(1)
  variantId: number;

  @IsString()
  @IsNotEmpty()
  value: string;
}
