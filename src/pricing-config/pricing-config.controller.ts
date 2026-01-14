import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common"
import { UpdatePricingConfigDto } from "./dto/update-pricing-config.dto"
import { JwtAuthGuard } from "src/auth/jwt-auth.guard"
import { RolesGuard } from "src/auth/roles.guard"
import { Roles } from "src/auth/roles.decorator"
import { Role } from "@prisma/client"
import { PricingConfigService } from "./pricing-config.service"

@Controller('pricing-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PricingConfigController {
    constructor(private readonly pricingConfigService: PricingConfigService) { }

    @Get()
    getConfig() {
        return this.pricingConfigService.getConfig()
    }

    @Patch()
    update(@Body() dto: UpdatePricingConfigDto) {
        return this.pricingConfigService.updateConfig(dto)
    }
}
