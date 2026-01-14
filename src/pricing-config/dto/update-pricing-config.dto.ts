import { IsNumber, Max, Min } from 'class-validator'

export class UpdatePricingConfigDto {
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    providerMarkupPercent: number // Ej: 10 = +10%
}
