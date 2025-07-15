import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateSaleDto {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsArray()
  productIds: number[];

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsString()
  deliveryMethod: "pickup" | "shipping";

  @IsOptional()
  @IsString()
  postalCode?: string;
}
