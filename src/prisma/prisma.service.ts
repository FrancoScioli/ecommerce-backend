import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }

  async enableShutdownHooks(app: INestApplication) {
    // @ts-expect-error: PrismaClient does support 'beforeExit' but it's not typed properly
    this.$on?.('beforeExit', async () => {
      await app.close()
    })
  }
}