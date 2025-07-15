import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from "../aws-s3/s3.service";
import { Product } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service
  ) { }

  async createWithVariants(
    dto: {
      name: string;
      description: string;
      price: number;
      categoryId: number;
      variants?: { name: string; options: string[] }[];
    },
    files: Express.Multer.File[],
  ) {
    //Subir imágenes a S3
    const uploadTasks = files.map((f) =>
      this.s3Service.uploadFile(f, 'products'),
    );
    const urls = await Promise.all(uploadTasks);

    const cleanVariants = dto.variants
      ?.filter((v) => v.name?.trim() && Array.isArray(v.options) && v.options.length > 0)
      .map((v) => ({
        name: v.name.trim(),
        options: {
          create: v.options
            .map((o) => (typeof o === 'string' ? o.trim() : ''))
            .filter((value) => value.length > 0)
            .map((value) => ({ value })),
        },
      })) ?? [];

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        categoryId: dto.categoryId,
        images: {
          create: urls.map((u) => ({ url: u })),
        },
        variants: {
          create: cleanVariants,
        },
      },
      include: {
        images: true,
        variants: {
          include: { options: true },
        },
        category: true,
      },
    });

    return product;
  }


  async create(dto: CreateProductDto, images: string[]) {
    const precioNum = parseFloat((dto as any).price);
    if (isNaN(precioNum) || precioNum <= 0) throw new BadRequestException("El precio debe ser un número válido mayor a 0");

    const categoryExists = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!categoryExists) throw new BadRequestException("Categoría no encontrada");

    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: precioNum,
        categoryId: dto.categoryId,
        images: { create: images.map((url) => ({ url })) },
      },
      include: { images: true, category: true },
    });
    return created;
  }

  async findAll(): Promise<Product[]> {
    const all = await this.prisma.product.findMany({ include: { images: true, category: true } });
    return all;
  }

  async findMany(categoryId?: number) {
    return this.prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        images: true,
        category: true,
        variants: {
          include: { options: true }
        }
      }
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        variants: {
          include: { options: true }
        }
      }
    });
    if (!product) throw new NotFoundException(`Product with id ${id} not found`);
    return product;
  }

  async remove(id: number): Promise<Product> {
    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
  }
}
