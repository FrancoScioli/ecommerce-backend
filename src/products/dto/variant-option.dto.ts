import { IsString } from 'class-validator';

export class VariantOptionDto {
  @IsString()
  value: string;
}