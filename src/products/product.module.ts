import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { S3Module } from 'src/aws-s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  providers: [ProductService],
  controllers: [ProductController]
})
export class ProductModule {}
