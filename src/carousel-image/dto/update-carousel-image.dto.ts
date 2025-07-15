import { IsOptional, IsBoolean, IsInt, Min } from "class-validator";

export class UpdateCarouselImageDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
