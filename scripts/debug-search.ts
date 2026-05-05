import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // Qué devuelve Prisma con ILIKE '%gorro%' en name
  const results = await p.product.findMany({
    where: { name: { contains: 'gorro', mode: 'insensitive' } },
    select: { id: true, name: true, isActive: true },
    take: 20,
  })
  console.log(`\nProductos con "gorro" en name (${results.length}):`)
  results.forEach(r => console.log(`  [${r.id}] "${r.name}" — activo: ${r.isActive}`))

  // Verificar si hay bolígrafos que matcheen
  const bolis = results.filter(r => r.name.toLowerCase().includes('bolí') || r.name.toLowerCase().includes('boli'))
  console.log(`\nDe esos, bolígrafos: ${bolis.length}`)
  bolis.forEach(r => console.log(`  "${r.name}"`))
}
main().catch(console.error).finally(() => p.$disconnect())
