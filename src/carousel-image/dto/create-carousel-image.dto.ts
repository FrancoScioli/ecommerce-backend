import { IsOptional, IsUUID, IsString, IsInt, Min } from "class-validator";

export class CarouselImageItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  imageUrl: string;

  @IsInt()
  @Min(0)
  order: number;
}

