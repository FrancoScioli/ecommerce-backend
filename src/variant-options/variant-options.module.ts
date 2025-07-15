import { Module } from '@nestjs/common';
import { VariantOptionsService } from './variant-options.service';
import { VariantOptionsController } from './variant-options.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [VariantOptionsController],
  providers: [VariantOptionsService, PrismaService],
})
export class VariantOptionsModule {}
