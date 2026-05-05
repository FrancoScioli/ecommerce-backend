import { Injectable } from "@nestjs/common";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { PrismaService } from "../prisma/prisma.service";
import { ShippingService } from "../shipping/shipping.service";
import { MailService } from "../mail/mail.service";

export interface PlaceOrderDto {
  customerName: string
  customerEmail: string
  customerPhone: string
  items: { productId: number; quantity: number; variant?: string }[]
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingService: ShippingService,
    private readonly mail: MailService,
  ) { }

  async findAllWithUser() {
    return this.prisma.sale.findMany({
      select: {
        id: true,
        total: true,
        createdAt: true,
        deliveryMethod: true,
        shippingAddress: true,
        postalCode: true,
        shippingCost: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        saleProducts: {
          select: {
            variant: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }


  async secureCreate(dto: CreateSaleDto) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      select: { id: true, price: true },
    });

    if (products.length === 0) {
      throw new Error("No se encontraron productos válidos");
    }

    const totalProducts = products.reduce((sum, p) => sum + p.price, 0);

    const shippingCost =
      dto.deliveryMethod === 'shipping' && dto.shippingAddress && dto.postalCode
        ? (await this.shippingService.estimateCost(dto.shippingAddress, dto.postalCode)).cost
        : 0;


    const totalFinal = totalProducts + shippingCost;

    return this.prisma.sale.create({
      data: {
        userId: dto.userId,
        total: totalFinal,
        shippingCost,
        deliveryMethod: dto.deliveryMethod ?? "pickup",
        shippingAddress: dto.shippingAddress ?? null,
        postalCode: dto.postalCode ?? null,
        saleProducts: {
          create: products.map((product) => ({
            product: { connect: { id: product.id } },
          })),
        },
      },
    });

  }

  async placeOrder(dto: PlaceOrderDto) {
    const productIds = dto.items.map((i) => i.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    })

    const total = dto.items.reduce((sum, item) => {
      const p = products.find((p) => p.id === item.productId)
      return sum + (p?.price ?? 0) * item.quantity
    }, 0)

    const sale = await this.prisma.sale.create({
      data: {
        total,
        deliveryMethod: 'shipping',
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        saleProducts: {
          create: dto.items.flatMap((item) =>
            Array.from({ length: item.quantity }, () => ({
              product: { connect: { id: item.productId } },
              variant: item.variant ?? null,
            })),
          ),
        },
      },
    })

    // Emails
    const config = await this.prisma.pricingConfig.findUnique({ where: { id: 1 } })
    const mailItems = dto.items.map((item) => {
      const p = products.find((p) => p.id === item.productId)!
      return { name: p.name, quantity: item.quantity, price: p.price, variant: item.variant }
    })
    const mailData = {
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      items: mailItems,
      total,
    }

    const adminEmail = config?.salesEmail
    if (adminEmail) {
      this.mail.sendOrderToAdmin(adminEmail, mailData).catch((err) => {
        console.error('[Mail] Error enviando mail al admin:', err?.message)
      })
    }
    this.mail.sendOrderConfirmationToCustomer(mailData).catch((err) => {
      console.error('[Mail] Error enviando confirmación al cliente:', err?.message)
    })

    return { ok: true, saleId: sale.id, total }
  }

  async findByUser(userId: number) {
    return this.prisma.sale.findMany({
      where: { userId },
      include: {
        saleProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }


}
