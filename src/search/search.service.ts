import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SearchQueryDto } from './dto/search-query.dto'

function normalizeString(str: string) {
    return str
        .normalize('NFD')                 // separa diacríticos
        .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')     // quita símbolos
}

@Injectable()
export class SearchService {
    constructor(private readonly prisma: PrismaService) { }

    async search({ q, limit }: SearchQueryDto) {
        const take = typeof limit === 'number' ? limit : 5
        const normalizedQ = normalizeString(q)

        // Productos candidatos + filtro normalizado 
        const rawProducts = await this.prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: { id: true, name: true, price: true, categoryId: true },
            take: take * 3,
        })

        const products = rawProducts
            .filter((p) => normalizeString(p.name).includes(normalizedQ))
            .slice(0, take)

        // Categorías para nombre de productos
        const categoryIds = Array.from(new Set(products.map((p) => p.categoryId).filter(Boolean)))
        const categoriesForNames = categoryIds.length
            ? await this.prisma.category.findMany({
                where: { id: { in: categoryIds } },
                select: { id: true, name: true },
            })
            : []
        const categoryMap = new Map(categoriesForNames.map((c) => [c.id, c.name]))

        // Primera imagen 
        const productIds = products.map((p) => p.id)
        const images = productIds.length
            ? await this.prisma.productImage.findMany({
                where: { productId: { in: productIds } },
                orderBy: { id: 'asc' },
                select: { productId: true, url: true },
            })
            : []
        const firstImageByProduct = new Map<number, string>()
        for (const img of images) {
            if (!firstImageByProduct.has(img.productId)) {
                firstImageByProduct.set(img.productId, img.url)
            }
        }

        const productsOut = products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            imageUrl: firstImageByProduct.get(p.id) ?? null,
            categoryName: p.categoryId ? categoryMap.get(p.categoryId) ?? null : null,
        }))

        // Categorías que matchean
        let rawCategories = await this.prisma.category.findMany({
            where: { name: { contains: q, mode: 'insensitive' } }, // candidatos
            select: { id: true, name: true },
            take: take * 3,
        })

        // Si no alcanza -  “boligrafo” vs “Bolígrafos” - superset y filtro normalizado
        if (rawCategories.length < take) {
            const superset = await this.prisma.category.findMany({
                select: { id: true, name: true },
                orderBy: { id: 'asc' },
                take: 300,
            })
            rawCategories = superset
        }

        const matchedCategories = rawCategories
            .filter((c) => normalizeString(c.name).includes(normalizedQ))
            .slice(0, take)

        return {
            products: productsOut,
            categories: matchedCategories,
        }
    }
}
