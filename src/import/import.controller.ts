import {
  Controller, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ImportService } from './import.service'
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'
import { RolesGuard } from 'src/auth/roles.guard'
import { Roles } from 'src/auth/roles.decorator'
import { Role } from '@prisma/client'

@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('products')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importProducts(@UploadedFile() file: Express.Multer.File) {
    return this.importService.importProductsFromExcel(file)
  }
}
