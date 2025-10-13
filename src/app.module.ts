import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './categories/category.module';
import { ProductImagesModule } from './product-images/product-images.module';
import { ProductModule } from './products/product.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { S3Module } from './aws-s3/s3.module';
import { VariantOptionsModule } from './variant-options/variant-options.module';
import { CarouselImageModule } from './carousel-image/carousel-image.module';
import { PaymentsModule } from './payments/payments.module';
import { SalesModule } from './sales/sales.module';
import { ShippingModule } from './shipping/shipping.module';
import { ZecatModule } from './zecat/zecat.module';
import { SearchModule } from './search/search.module';


@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' 
        ? '/etc/secrets/.env' 
        : '.env'
      }),
    PrismaModule,
    CategoryModule,
    S3Module,
    ProductImagesModule,
    ProductModule,
    AuthModule,
    CartModule,
    VariantOptionsModule,
    CarouselImageModule,
    PaymentsModule,
    SalesModule,
    ShippingModule,
    ZecatModule,
    SearchModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
