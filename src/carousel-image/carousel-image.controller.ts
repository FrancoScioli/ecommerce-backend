import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Patch,
  Req,
  BadRequestException,
  UseGuards,
  ParseFilePipe,
  FileTypeValidator,
  Get,
  Delete,
  Param,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { plainToClass } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { CarouselImageService } from "./carousel-image.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "@prisma/client";
import { CarouselImageItemDto } from "./dto/create-carousel-image.dto";

@Controller("carousel-image")
export class CarouselImageController {
  constructor(private readonly carouselService: CarouselImageService) { }

  @Post("upload")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  async uploadCarouselImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: "image/*" })],
      })
    )
    file: Express.Multer.File,
    @Body() body: any
  ) {
    if (!file) throw new BadRequestException("Archivo no recibido o inválido");

    const order = parseInt(body.order, 10);

    if (isNaN(order) || order < 0) throw new BadRequestException("Valor de orden inválido");

    return this.carouselService.create(file, order);
  }

  @Patch("bulk")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateBulk(@Req() req: Request) {
    const raw = (req as any).rawBody as string;

    let arr: any[];
    try {
      arr = JSON.parse(raw);
    } catch (err) {
      throw new BadRequestException("Body is not valid JSON array");
    }

    const dtos = arr.map(o => plainToClass(CarouselImageItemDto, o));
    const errorsList: ValidationError[][] = [];

    for (const dto of dtos) {
      const errs = await validate(dto);
      if (errs.length) errorsList.push(errs);
    }

    if (errorsList.length) {
      throw new BadRequestException({
        message: "Validation failed",
        errors: errorsList.map(errs => errs.map(e => e.constraints)),
      });
    }

    const result = await this.carouselService.updateBulk(dtos);

    return result;
  }

  @Get()
  async findAll() {
    return this.carouselService.findAll();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.carouselService.remove(id);
  }
}
