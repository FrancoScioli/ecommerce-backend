import {
  Controller, Get, Post, Body, Param, Delete,
  UseGuards, UseInterceptors, UploadedFiles, BadRequestException,
  Query
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductService } from './product.service';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Get()
  async findAll(@Query('categoryId') categoryId?: string) {
    const id = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.productService.findMany(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'images', maxCount: 5 }],
    {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Sólo JPG/PNG/WebP'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }
  ))
  async create(
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('price') priceStr: string,
    @Body('categoryId') catStr: string,
    @Body('variants') variantsRaw: string,
  ) {
    const price = parseFloat(priceStr);
    const categoryId = parseInt(catStr, 10);
    if (isNaN(price) || price <= 0) throw new BadRequestException('Precio inválido');
    if (isNaN(categoryId)) throw new BadRequestException('Categoría inválida');

    let variants = [];
    if (variantsRaw) {
      try {
        const parsed = JSON.parse(variantsRaw);
        variants = parsed.map((v: any) => ({
          name: v.name?.trim(),
          options: (Array.isArray(v.options) ? v.options : [])
            .map((o: string) => o?.trim())
            .filter((val: string) => !!val)
        })).filter(v => v.name && v.options.length > 0);
      } catch {
        throw new BadRequestException('El formato de variants no es JSON válido');
      }
    }

    return this.productService.createWithVariants(
      { name, description, price, categoryId, variants },
      files.images || []
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
