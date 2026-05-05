import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const img = await p.productImage.findFirst({ select: { url: true } })
  const cat = await p.category.findFirst({ where: { imageUrl: { not: '' } }, select: { imageUrl: true } })
  const car = await p.carouselImage.findFirst({ select: { imageUrl: true } })
  console.log('ProductImage:', img?.url ?? 'none')
  console.log('Category:', cat?.imageUrl ?? 'none')
  console.log('Carousel:', car?.imageUrl ?? 'none')
}
main().catch(console.error).finally(() => p.$disconnect())
