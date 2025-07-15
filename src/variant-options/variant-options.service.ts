import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantOptionDto } from './dto/create-variant-option.dto';

@Injectable()
export class VariantOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantOptionDto) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant) {
      throw new BadRequestException(`Variant with id ${dto.variantId} not found`);
    }

    return this.prisma.variantOption.create({
      data: {
        value: dto.value,
        variantId: dto.variantId,
      },
    });
  }
}
