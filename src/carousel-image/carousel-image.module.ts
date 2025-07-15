import { Module } from '@nestjs/common';
import { CarouselImageService } from './carousel-image.service';
import { CarouselImageController } from './carousel-image.controller';
import { S3Module } from 'src/aws-s3/s3.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [CarouselImageController],
  providers: [CarouselImageService],
})
export class CarouselImageModule {}
