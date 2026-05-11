import { IsArray, IsEmail, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpdatePricingConfigDto {
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    providerMarkupPercent?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(48)
    zecatSyncIntervalHours?: number

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(23)
    zecatDetailSyncHour?: number

    @IsOptional()
    @IsString()
    salesEmail?: string

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    featuredCategoryIds?: number[]

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    featuredProductIds?: number[]
}
