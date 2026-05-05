import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const cats = await p.category.count({ where: { source: 'ZECAT' } })
  const allCats = await p.category.findMany({ where: { source: 'ZECAT' }, select: { id: true, name: true, externalId: true } })

  const prods = await p.product.count({ where: { source: 'ZECAT' } })
  const active = await p.product.count({ where: { source: 'ZECAT', isActive: true } })
  const inactive = await p.product.count({ where: { source: 'ZECAT', isActive: false } })
  const noImg = await p.product.count({ where: { source: 'ZECAT', images: { none: {} } } })
  const imgs = await p.productImage.count()
  const variants = await p.variant.count()

  // Muestra de 5 productos con precio para verificar costeo
  const sample = await p.product.findMany({
    where: { source: 'ZECAT', price: { gt: 0 } },
    select: { name: true, price: true, sku: true, stock: true, isActive: true },
    take: 5,
    orderBy: { updatedAt: 'desc' },
  })

  // Precio min/max/avg
  const agg = await p.product.aggregate({
    where: { source: 'ZECAT', price: { gt: 0 } },
    _min: { price: true },
    _max: { price: true },
    _avg: { price: true },
  })

  // Config de pricing actual
  const config = await p.pricingConfig.findUnique({ where: { id: 1 } })

  console.log('\n=== CONFIGURACIÓN DE PRECIO ===')
  console.log(`Markup: ${config?.providerMarkupPercent}% | IVA: 21% fijo`)
  console.log(`Factor total aplicado: (1 + ${config?.providerMarkupPercent}/100) × 1.21`)

  console.log('\n=== CATEGORÍAS ZECAT ===')
  console.log(`Total: ${cats}`)
  allCats.forEach(c => console.log(`  [${c.externalId}] ${c.name}`))

  console.log('\n=== PRODUCTOS ZECAT ===')
  console.log(`Total: ${prods} | Activos: ${active} | Inactivos (sin stock): ${inactive}`)
  console.log(`Sin imagen: ${noImg} | Total imágenes: ${imgs} | Total variantes: ${variants}`)

  console.log('\n=== PRECIOS (productos con precio > 0) ===')
  console.log(`Mínimo: $${agg._min.price?.toFixed(2)} | Máximo: $${agg._max.price?.toFixed(2)} | Promedio: $${agg._avg.price?.toFixed(2)}`)

  console.log('\n=== MUESTRA DE 5 PRODUCTOS (más recientes) ===')
  sample.forEach(pr => console.log(`  "${pr.name}" | Precio final: $${pr.price.toFixed(2)} | Stock: ${pr.stock} | Activo: ${pr.isActive}`))

  // Verifica un precio concreto: toma el primer producto con precio y muestra el cálculo
  const first = await p.product.findFirst({
    where: { source: 'ZECAT', price: { gt: 0 } },
    select: { name: true, price: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (first && config) {
    const markup = Number(config.providerMarkupPercent) / 100
    const factor = (1 + markup) * 1.21
    const precioBase = first.price / factor
    console.log('\n=== VERIFICACIÓN DE CÁLCULO (último producto sincronizado) ===')
    console.log(`Producto: "${first.name}"`)
    console.log(`Precio guardado en DB: $${first.price.toFixed(2)}`)
    console.log(`Factor aplicado: ${factor.toFixed(6)}`)
    console.log(`Precio base implícito del proveedor: $${precioBase.toFixed(2)}`)
    console.log(`Comprobación: $${precioBase.toFixed(2)} × ${factor.toFixed(4)} = $${(precioBase * factor).toFixed(2)}`)
  }
}

main().catch(console.error).finally(() => p.$disconnect())
