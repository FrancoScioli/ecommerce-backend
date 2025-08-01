import { Controller, Get, Post, Body, Param, Delete, UseGuards, NotFoundException, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from '@prisma/client';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { extname } from 'path';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../aws-s3/s3.service';


@Controller('category')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly config: ConfigService,
    private readonly s3Service: S3Service
  ) { }

  @UseGuards(JwtAuthGuard)

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(new BadRequestException('Solo se permiten imágenes JPG/PNG/WEBP'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    if (!file) throw new BadRequestException('Se requiere una imagen');
    if (!name) throw new BadRequestException('Se requiere el nombre de la categoría');    
    const imageUrl = await this.s3Service.uploadFile(file, 'categories');

    const dto: CreateCategoryDto = { name, imageUrl };
    return this.categoryService.create(dto);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.categoryService.remove(+id);
    if (!deleted) throw new NotFoundException('Categoría no encontrada');
    return { message: 'Categoría eliminada' };
  }
}
