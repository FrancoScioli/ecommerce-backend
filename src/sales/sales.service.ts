import { Injectable } from "@nestjs/common";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { PrismaService } from "../prisma/prisma.service";
import { ShippingService } from "../shipping/shipping.service";

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingService: ShippingService,
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
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        saleProducts: {
          select: {
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
