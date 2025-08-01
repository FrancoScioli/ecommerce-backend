import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { S3Module } from 'src/aws-s3/s3.module';

@Module({
  providers: [CategoryService, S3Module],
  controllers: [CategoryController]
})
export class CategoryModule {}
