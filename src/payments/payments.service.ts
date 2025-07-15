import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';

@Injectable()
export class PaymentsService {
  private preferenceClient: Preference;

  constructor() {
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });

    this.preferenceClient = new Preference(mpClient);
  }

  async createPaymentPreference(
    items: Array<{
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
      currency_id?: string;
    }>,
    backUrls: { success: string; failure: string; pending: string },
    deliveryMethod: 'pickup' | 'shipping',
    shippingAddress?: string,
    postalCode?: string
  ): Promise<string> {
    const preferenceBody: any = {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id || 'ARS',
      })),
      back_urls: backUrls,
      auto_return: 'approved',
    };

    if (
      deliveryMethod === 'shipping' &&
      shippingAddress &&
      postalCode
    ) {
      preferenceBody.shipments = {
        mode: 'me2',
        local_pickup: false,
        receiver_address: {
          zip_code: postalCode,
          street_name: shippingAddress,
        },
        dimensions: '20x20x20,20000',
      };
    }

    const response = await this.preferenceClient.create({ body: preferenceBody });
    return response.init_point!;
  }
}
