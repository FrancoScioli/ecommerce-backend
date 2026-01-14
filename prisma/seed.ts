import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) throw new Error('Faltan ADMIN_EMAIL o ADMIN_PASSWORD en el archivo .env');

  const hashed = await bcrypt.hash(password, 10)
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hashed, role: 'ADMIN', firstName: 'Admin', lastName: 'User'},
    })
  } else {
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
      },
    })

  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
