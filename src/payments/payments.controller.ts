import { Controller, Post, Body, BadRequestException, Get, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Response } from 'express';


@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('create-preference')
    async createPreference(@Body() body: any) {
        const {
            email,
            cart,
            total,
            deliveryMethod,
            shippingAddress,
            postalCode,
        } = body;

        if (!process.env.MP_SUCCESS_URL || !process.env.MP_FAILURE_URL || !process.env.MP_PENDING_URL) {
            throw new BadRequestException('Missing Mercado Pago redirect URLs in .env');
        }

        const backUrls = {
            success: process.env.MP_SUCCESS_URL!,
            failure: process.env.MP_FAILURE_URL!,
            pending: process.env.MP_PENDING_URL!,
        };

        if (!backUrls.success) {
            throw new BadRequestException('El back_url.success es obligatorio para Mercado Pago');
        }

        const url = await this.paymentsService.createPaymentPreference(
            cart,
            backUrls,
            deliveryMethod,
            shippingAddress,
            postalCode,
        );

        return { url };
    }


    @Get('success')
    paymentSuccess(@Res() res: Response) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
    }

    @Get('failure')
    paymentFailure(@Res() res: Response) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
    }

    @Get('pending')
    paymentPending(@Res() res: Response) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment-pending`);
    }
}
