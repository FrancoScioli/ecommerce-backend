import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { S3Service } from '../aws-s3/s3.service'
import { Prisma, Product } from '@prisma/client'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) { }

  // ─── include reutilizable ─────────────────────────────────────────────────
  private get fullInclude() {
    return {
      images: true,
      categories: true,          // many-to-many: array de categorías
      variants: { include: { options: true } },
    } satisfies Prisma.ProductInclude
  }

  // ─── createWithVariants ───────────────────────────────────────────────────
  async createWithVariants(
    dto: {
      name: string
      description: string
      price: number
      categoryIds: number[]
      variants?: { name: string; options: string[] }[]
    },
    files: Express.Multer.File[],
  ) {
    const uploadTasks = files.map((f) => this.s3Service.uploadFile(f, 'products'))
    const urls = await Promise.all(uploadTasks)

    const cleanVariants =
      dto.variants
        ?.filter((v) => v.name?.trim() && Array.isArray(v.options) && v.options.length > 0)
        .map((v) => ({
          name: v.name.trim(),
          options: {
            create: v.options
              .map((o) => (typeof o === 'string' ? o.trim() : ''))
              .filter((value) => value.length > 0)
              .map((value) => ({ value })),
          },
        })) ?? []

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        categories: {
          connect: dto.categoryIds.map((id) => ({ id })),
        },
        images: {
          create: urls.map((u) => ({ url: u })),
        },
        variants: {
          create: cleanVariants,
        },
      },
      include: this.fullInclude,
    })
  }

  async create(dto: CreateProductDto, images: string[]) {
    const precioNum = parseFloat((dto as any).price)
    if (isNaN(precioNum) || precioNum <= 0)
      throw new BadRequestException('El precio debe ser un número válido mayor a 0')

    // Verificamos que todas las categorías existan
    const found = await this.prisma.category.findMany({
      where: { id: { in: dto.categoryIds } },
      select: { id: true },
    })
    if (found.length !== dto.categoryIds.length)
      throw new BadRequestException('Una o más categorías no fueron encontradas')

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: precioNum,
        categories: {
          connect: dto.categoryIds.map((id) => ({ id })),
        },
        images: { create: images.map((url) => ({ url })) },
      },
      include: this.fullInclude,
    })
  }

  // ─── findAll ──────────────────────────────────────────────────────────────
  async findAll(): Promise<any[]> {
    return this.prisma.product.findMany({ include: this.fullInclude })
  }

  // ─── findMany (con filtro opcional por categoría) ─────────────────────────
  async findMany(categoryId?: number) {
    return this.prisma.product.findMany({
      where: categoryId
        ? { categories: { some: { id: categoryId } } }  // many-to-many filter
        : undefined,
      include: this.fullInclude,
    })
  }

  // ─── findOne ──────────────────────────────────────────────────────────────
  async findOne(id: number): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.fullInclude,
    })
    if (!product) throw new NotFoundException(`Product with id ${id} not found`)
    return product
  }

  // ─── remove ───────────────────────────────────────────────────────────────
  async remove(id: number): Promise<Product> {
    try {
      return await this.prisma.product.delete({ where: { id } })
    } catch {
      throw new NotFoundException(`Product with id ${id} not found`)
    }
  }

  // ─── update ───────────────────────────────────────────────────────────────
  async update(
    id: number,
    dto: UpdateProductDto,
    images: Express.Multer.File[] = [],
  ) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: this.fullInclude,
    })
    if (!existing) throw new NotFoundException('Product not found')

    const data: Prisma.ProductUpdateInput = {
      updatedAt: new Date(),
    }

    if (dto.name !== undefined) data.name = dto.name
    if (dto.description !== undefined) data.description = dto.description
    if (dto.price !== undefined) data.price = dto.price
    if (dto.sku !== undefined) data.sku = dto.sku
    if (dto.stock !== undefined) data.stock = dto.stock
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    if (dto.categoryIds !== undefined && dto.categoryIds.length > 0) {
      data.categories = {
        set: dto.categoryIds.map((catId) => ({ id: catId })),
      }
    }

    await this.prisma.product.update({ where: { id }, data })

    if (dto.variants && Array.isArray(dto.variants)) {
      await this.prisma.variantOption.deleteMany({
        where: { variant: { productId: id } },
      })
      await this.prisma.variant.deleteMany({ where: { productId: id } })

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

    // Imágenes nuevas opcionales
    if (images?.length) {
      const uploads: { url: string }[] = []
      for (const file of images) {
        const url = await this.s3Service.uploadFile(file, 'products')
        uploads.push({ url })
      }
      if (uploads.length) {
        await this.prisma.productImage.createMany({
          data: uploads.map((u) => ({ productId: id, url: u.url })),
          skipDuplicates: true,
        })
      }
    }

    return this.prisma.product.findUnique({
      where: { id },
      include: this.fullInclude,
    })
  }
}
