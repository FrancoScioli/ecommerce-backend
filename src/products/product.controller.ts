import {
  Controller, Get, Post, Body, Param, Delete,
  UseGuards, UseInterceptors, UploadedFiles, BadRequestException,
  Query,
  Put,
  ParseIntPipe
} from '@nestjs/common'
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ProductService } from './product.service'
import { UpdateProductDto } from './dto/update-product.dto'

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }


  @Get()
  async findAll(@Query('categoryId') categoryId?: string) {
    const id = categoryId ? parseInt(categoryId, 10) : undefined
    return this.productService.findMany(id)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id)
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'images', maxCount: 5 }],
    {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Sólo JPG/PNG/WebP'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }
  ))
  async create(
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('price') priceStr: string,
    @Body('categoryIds') categoryIdsRaw: string, // "[1,3]" o "1" para compatibilidad
    @Body('variants') variantsRaw: string,
  ) {
    const price = parseFloat(priceStr)
    if (isNaN(price) || price <= 0) throw new BadRequestException('Precio inválido')

    // Aceptamos tanto un array JSON como un único número para retrocompatibilidad
    let categoryIds: number[]
    try {
      const parsed = JSON.parse(categoryIdsRaw)
      categoryIds = Array.isArray(parsed)
        ? parsed.map(Number)
        : [Number(parsed)]
    } catch {
      // fallback: entero directo
      const single = parseInt(categoryIdsRaw, 10)
      if (isNaN(single)) throw new BadRequestException('categoryIds inválido')
      categoryIds = [single]
    }

    if (categoryIds.some(isNaN)) throw new BadRequestException('categoryIds contiene valores inválidos')

    let variants: { name: string; options: string[] }[] = []
    if (variantsRaw) {
      try {
        const parsed = JSON.parse(variantsRaw)
        variants = parsed
          .map((v: any) => ({
            name: v.name?.trim(),
            options: (Array.isArray(v.options) ? v.options : [])
              .map((o: string) => o?.trim())
              .filter((val: string) => !!val),
          }))
          .filter((v: any) => v.name && v.options.length > 0)
      } catch {
        throw new BadRequestException('El formato de variants no es JSON válido')
      }
    }

    return this.productService.createWithVariants(
      { name, description, price, categoryIds, variants },
      files.images || [],
    )
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id)
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('images', 5))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ) {
    return this.productService.update(id, dto, images)
  }
}
