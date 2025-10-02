import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from "../aws-s3/s3.service";
import { Prisma, Product } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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

  async update(
    id: number,
    dto: UpdateProductDto,
    images: Express.Multer.File[] = [],
  ) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: { include: { options: true } }, category: true },
    })
    if (!existing) throw new NotFoundException('Product not found')

    // Construimos el objeto de actualización de forma condicional
    const data: Prisma.ProductUpdateInput = {
      updatedAt: new Date(),
    }

    if (dto.name !== undefined) data.name = dto.name
    if (dto.description !== undefined) data.description = dto.description
    if (dto.price !== undefined) data.price = dto.price
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } }
    }
    if (dto.sku !== undefined) data.sku = dto.sku
    if (dto.stock !== undefined) data.stock = dto.stock
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    // Si querés asegurarte de mantener el source:
    // if (!existing.source) data.source = Source.MANUAL  // o el que corresponda

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: { images: true, variants: { include: { options: true } }, category: true },
    })

    // Variants (sincronización simple): si viene `variants`, actualizamos
    if (dto.variants && Array.isArray(dto.variants)) {
      // Borro variantes y sus opciones y vuelvo a crear (modelo simple y robusto)
      await this.prisma.variantOption.deleteMany({
        where: { variant: { productId: id } },
      })
      await this.prisma.variant.deleteMany({
        where: { productId: id },
      })

      for (const v of dto.variants) {
        const variant = await this.prisma.variant.create({
          data: { productId: id, name: v.name },
        })
        const values = (v.options ?? [])
          .map((o) => String(o).trim())
          .filter(Boolean)

        if (values.length) {
          await this.prisma.variantOption.createMany({
            data: values.map((value) => ({ variantId: variant.id, value })),
            skipDuplicates: true,
          })
        }
      }
    }

    // Imágenes nuevas (opcionales en update)
    if (images?.length) {
      // Aquí subís/guardás los archivos y obtenés URLs finales
      // Suponiendo que guardás el buffer y retornás una URL por imagen:
      const uploads = [] as { url: string }[]
      for (const file of images) {
        // TODO: subir a tu storage y obtener `url`
        // const url = await this.uploader.upload(file) ...
        // Por ahora, placeholder:
        const url = `uploads/${Date.now()}_${file.originalname}`
        uploads.push({ url })
      }

      if (uploads.length) {
        await this.prisma.productImage.createMany({
          data: uploads.map((u) => ({ productId: id, url: u.url })),
          skipDuplicates: true,
        })
      }
    }

    // Devolver con relaciones frescas
    return this.prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: { include: { options: true } }, category: true },
    })
  }
}
