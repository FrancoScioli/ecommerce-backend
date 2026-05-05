import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ShippingModule } from '../shipping/shipping.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ShippingModule, MailModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
