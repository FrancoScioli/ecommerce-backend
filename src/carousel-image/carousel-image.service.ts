import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { S3Service } from "src/aws-s3/s3.service";

@Injectable()
export class CarouselImageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service
  ) { }

  async create(file: Express.Multer.File, order: number) {
    const imageUrl = await this.s3Service.uploadFile(file, "carousel");

    return this.prisma.carouselImage.create({
      data: {
        imageUrl,
        order,
        isActive: true,
      },
    });
  }

  async updateBulk(items: any[]) {
    return this.prisma.$transaction(
      items.map((item) => {
        if (item.id) {
          return this.prisma.carouselImage.update({
            where: { id: item.id },
            data: {
              imageUrl: item.imageUrl,
              order: item.order,
              isActive: true,
            },
          });
        } else {
          return this.prisma.carouselImage.create({
            data: {
              imageUrl: item.imageUrl,
              order: item.order,
              isActive: true,
            },
          });
        }
      })
    );
  }

  async findAll() {
    return this.prisma.carouselImage.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.carouselImage.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    try {
      return await this.prisma.carouselImage.delete({ where: { id } });
    } catch (err) {
      throw new NotFoundException(`Imagen con id ${id} no encontrada`);
    }
  }
}
