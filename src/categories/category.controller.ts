import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CategoryService } from './category.service';
import { S3Service } from '../aws-s3/s3.service';

@Controller('category')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly s3: S3Service,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif|svg\+xml)$/)) {
          return cb(new BadRequestException('Sólo JPG/PNG/WebP/GIF/SVG'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body('name') name: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!name?.trim()) throw new BadRequestException('El nombre es obligatorio');
    const imageUrl = file ? await this.s3.uploadFile(file, 'categories') : '';
    return this.categoryService.create({ name: name.trim(), imageUrl });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif|svg\+xml)$/)) {
          return cb(new BadRequestException('Sólo JPG/PNG/WebP/GIF/SVG'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name?: string,
    @Body('lockName') lockName?: string,
    @Body('lockImage') lockImage?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? await this.s3.uploadFile(file, 'categories') : undefined;
    return this.categoryService.update(id, {
      name: name?.trim() || undefined,
      imageUrl,
      lockName: lockName === 'true',
      lockImage: lockImage === 'true',
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }

  @Get()
  findAll(
    @Query('hideEmpty') hideEmpty?: string,
    @Query('onlyActive') onlyActive?: string,
    @Query('withCounts') withCounts?: string,
    @Query('minProducts') minProducts?: string,
  ) {
    return this.categoryService.findAll({
      hideEmpty: hideEmpty === 'true',
      onlyActiveProducts: onlyActive === 'true',
      withCounts: withCounts === 'true',
      minProducts: minProducts ? Number(minProducts) : undefined,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('withProducts') withProducts?: string,
    @Query('onlyActive') onlyActive?: string,
    @Query('withCounts') withCounts?: string,
  ) {
    return this.categoryService.findOne(id, {
      withProducts: withProducts === 'true',
      onlyActiveProducts: onlyActive !== 'false',
      withCounts: withCounts === 'true',
    });
  }
}
