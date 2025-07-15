import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';


@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    if (!dto.name || !dto.imageUrl) {
      throw new BadRequestException('Faltan datos obligatorios');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({ include: { products: true } });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async remove(id: number): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (count) {
      throw new BadRequestException(
        `No se puede eliminar: hay ${count} producto(s) asociado(s).`
      );
    }
    await this.prisma.category.delete({
      where: { id },
    });
    return true;
  }
}
