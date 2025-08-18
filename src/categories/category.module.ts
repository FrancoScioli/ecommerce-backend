import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { S3Module } from '../aws-s3/s3.module';

@Module({
  imports: [S3Module],
  providers: [CategoryService],
  controllers: [CategoryController]
})
export class CategoryModule {}
