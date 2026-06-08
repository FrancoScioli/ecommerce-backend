import {
  Controller, Get, Post, Body, Param, Delete,
  UseGuards, UseInterceptors, UploadedFiles, BadRequestException,
  Query,
  Put,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductService } from './product.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { Request } from 'express';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Get()
  async findAll(@Query('categoryId') categoryId?: string) {
    const id = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.productService.findMany(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  async findAllAdmin() {
    return this.productService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'images', maxCount: 10 }],
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

  @Put(':id')
  @UseInterceptors(FilesInterceptor('images', 10, {
    storage: memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Sólo JPG/PNG/WebP'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ) {
    // Leemos directamente del body parseado por multer (FormData) sin pasar por ValidationPipe
    const b = req.body as Record<string, string>
    const dto: UpdateProductDto = new UpdateProductDto()
    if (b.name !== undefined) dto.name = b.name
    if (b.description !== undefined) dto.description = b.description
    if (b.price !== undefined) { const p = parseFloat(b.price); if (!isNaN(p)) dto.price = p }
    if (b.categoryId !== undefined) { const c = parseInt(b.categoryId, 10); if (!isNaN(c)) dto.categoryId = c }
    if (b.isActive !== undefined) dto.isActive = b.isActive === 'true'
    if (b.coverImageId !== undefined) { const cid = parseInt(b.coverImageId, 10); if (!isNaN(cid)) dto.coverImageId = cid }
    if (b.variants) {
      try {
        const parsed = JSON.parse(b.variants)
        dto.variants = (Array.isArray(parsed) ? parsed : [])
          .map((v: { name?: string; options?: (string | { value?: string })[] }) => ({
            name: v.name?.trim() ?? '',
            options: (Array.isArray(v.options) ? v.options : [])
              .map((o) => ({ value: typeof o === 'string' ? o.trim() : String((o as { value?: string }).value ?? '').trim() }))
              .filter((o) => o.value.length > 0),
          }))
          .filter((v) => v.name && v.options.length > 0)
      } catch { /* ignorar variantes inválidas */ }
    }
    return this.productService.update(id, dto, images)
  }
}
