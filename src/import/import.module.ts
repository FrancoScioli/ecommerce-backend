import { Module } from '@nestjs/common'
import { ImportService } from './import.service'
import { ImportController } from './import.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
  controllers: [ImportController],
  providers: [ImportService, PrismaService],
})
export class ImportModule {}
