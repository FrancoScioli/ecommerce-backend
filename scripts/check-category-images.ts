import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const cats = await p.category.findMany({
    where: { imageUrl: { not: '' } },
    select: { id: true, name: true, imageUrl: true },
    take: 5,
  })
  cats.forEach(c => console.log(`[${c.id}] ${c.name}\n    ${c.imageUrl}`))
}
main().catch(console.error).finally(() => p.$disconnect())
