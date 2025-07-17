import 'reflect-metadata'
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { join } from "path"
import { NestExpressApplication } from "@nestjs/platform-express"
import * as dotenv from "dotenv"
import { ValidationPipe } from "@nestjs/common"
import * as bodyParser from 'body-parser'
import * as express from 'express'

async function bootstrap() {
  dotenv.config()

  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  })

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }))

  app.useStaticAssets(join(__dirname, "..", "uploads"), {
    prefix: "/uploads",
  })

  // Para capturar rawBody como texto para este endpoint
  app.use('/carousel-image/bulk', bodyParser.text({ type: '*/*' }))

  app.use((req, res, next) => {
    if (req.method === 'PATCH' && req.path === '/carousel-image/bulk') {
      const raw = (req as any).body
        ; (req as any).rawBody = raw
    }
    next()
  })

  await app.listen(process.env.PORT || 3001)
}

bootstrap()
