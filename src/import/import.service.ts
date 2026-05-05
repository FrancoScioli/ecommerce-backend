import { Injectable, BadRequestException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { PrismaService } from '../prisma/prisma.service'

interface ImportRow {
  nombre?: string
  descripcion?: string
  precio?: number | string
  categoria?: string
  sku?: string
  activo?: string
  variantes?: string
  imagenes?: string
}

export interface ImportResult {
  created: number
  skipped: number
  errors: string[]
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importProductsFromExcel(file: Express.Multer.File): Promise<ImportResult> {
    let rows: ImportRow[]
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' })
    } catch {
      throw new BadRequestException('No se pudo leer el archivo Excel. Verificá el formato.')
    }

    if (rows.length === 0) throw new BadRequestException('El archivo está vacío.')

    const result: ImportResult = { created: 0, skipped: 0, errors: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel row number (1-indexed + header)

      const nombre = String(row.nombre ?? '').trim()
      const descripcion = String(row.descripcion ?? '').trim()
      const precioRaw = String(row.precio ?? '').trim()
      const categoriaNombre = String(row.categoria ?? '').trim()

      if (!nombre || !precioRaw || !categoriaNombre) {
        result.errors.push(`Fila ${rowNum}: faltan campos obligatorios (nombre, precio, categoria).`)
        result.skipped++
        continue
      }

      const precio = parseFloat(precioRaw.replace(',', '.'))
      if (isNaN(precio) || precio < 0) {
        result.errors.push(`Fila ${rowNum}: precio inválido "${precioRaw}".`)
        result.skipped++
        continue
      }

      try {
        // Find or create category
        let category = await this.prisma.category.findFirst({
          where: { name: { equals: categoriaNombre, mode: 'insensitive' } },
        })
        if (!category) {
          category = await this.prisma.category.create({
            data: { name: categoriaNombre, imageUrl: '' },
          })
        }

        const isActive = String(row.activo ?? '').trim().toLowerCase() !== 'no'
        const sku = String(row.sku ?? '').trim() || undefined

        // Parse image URLs
        const imageUrls = String(row.imagenes ?? '')
          .split(',')
          .map((u) => u.trim())
          .filter((u) => u.startsWith('http'))

        // Parse variants: "Color:Rojo,Azul|Talle:S,M,L"
        const variantGroups: { name: string; options: string[] }[] = []
        const variantesRaw = String(row.variantes ?? '').trim()
        if (variantesRaw) {
          for (const group of variantesRaw.split('|')) {
            const sepIdx = group.indexOf(':')
            if (sepIdx === -1) continue
            const name = group.slice(0, sepIdx).trim()
            const options = group
              .slice(sepIdx + 1)
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
            if (name && options.length > 0) variantGroups.push({ name, options })
          }
        }

        await this.prisma.product.create({
          data: {
            name: nombre,
            description: descripcion,
            price: precio,
            categoryId: category.id,
            sku,
            isActive,
            images:
              imageUrls.length > 0
                ? { create: imageUrls.map((url) => ({ url })) }
                : undefined,
            variants:
              variantGroups.length > 0
                ? {
                    create: variantGroups.map((vg) => ({
                      name: vg.name,
                      options: { create: vg.options.map((value) => ({ value })) },
                    })),
                  }
                : undefined,
          },
        })

        result.created++
      } catch (err: any) {
        result.errors.push(`Fila ${rowNum} ("${nombre}"): ${err?.message ?? 'error desconocido'}.`)
        result.skipped++
      }
    }

    return result
  }
}
