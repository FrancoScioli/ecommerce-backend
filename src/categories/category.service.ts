import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';

type FindAllParams = {
  hideEmpty?: boolean;
  onlyActiveProducts?: boolean;
  withCounts?: boolean;
  minProducts?: number;
};

type FindOneParams = {
  withProducts?: boolean;
  onlyActiveProducts?: boolean;
  withCounts?: boolean;
};

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCategoryDto) {
    if (!dto.name || !dto.imageUrl) {
      throw new BadRequestException('Faltan datos obligatorios');
    }
    return this.prisma.category.create({
      data: { name: dto.name, imageUrl: dto.imageUrl },
    });
  }

  async findAll(params: FindAllParams = {}) {
    const {
      hideEmpty = false,
      onlyActiveProducts = false,
      withCounts = false,
      minProducts,
    } = params;

    const where = hideEmpty
      ? {
        products: {
          some: onlyActiveProducts ? { isActive: true } : {},
        },
      }
      : undefined;

    const select: Prisma.CategorySelect = {
      id: true,
      name: true,
      imageUrl: true,
      ...(withCounts ? { _count: { select: { products: true } } } : {}),
    };

    const list = await this.prisma.category.findMany({
      where,
      select,
      orderBy: { name: 'asc' },
    });

    if (typeof minProducts === 'number') {
      return list.filter((c: any) => (c._count?.products ?? 0) >= minProducts);
    }
    return list;
  }

  async findOne(id: number, params: FindOneParams = {}): Promise<any> {
    const {
      withProducts = false,
      onlyActiveProducts = true,
      withCounts = false,
    } = params;

    if (withProducts) {
      const include: Prisma.CategoryInclude = onlyActiveProducts
        ? { products: { where: { isActive: true } } }
        : { products: true };

      const category = await this.prisma.category.findUnique({
        where: { id },
        include,
      });

      if (!category) {
        throw new NotFoundException(`Category with id ${id} not found`);
      }
      return category;
    } else {
      const select: Prisma.CategorySelect = {
        id: true,
        name: true,
        imageUrl: true,
        ...(withCounts ? { _count: { select: { products: true } } } : {}),
      };

      const category = await this.prisma.category.findUnique({
        where: { id },
        select,
      });

      if (!category) {
        throw new NotFoundException(`Category with id ${id} not found`);
      }
      return category;
    }
  }
  async remove(id: number): Promise<boolean> {
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count) {
      throw new BadRequestException(`No se puede eliminar: hay ${count} producto(s) asociado(s).`);
    }
    await this.prisma.category.delete({ where: { id } });
    return true;
  }
}
