import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const email = 'merchandising-7m@hotmail.com'
  const password = 'caroalay0n'

  await prisma.user.deleteMany({
    where: { email: { in: ['merchandising-7M@hotmail.com', 'merchandising-7m@hotmail.com'] } },
  })

  const hash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: '7M',
    },
  })

  console.log(`Admin creado: ${user.email} (id=${user.id}, role=${user.role})`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
