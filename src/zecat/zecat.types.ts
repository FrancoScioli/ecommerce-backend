// src/zecat/types.ts

export interface ZecatCategory {
  id?: string | number
  name?: string
  title?: string
  imageUrl?: string | null
}

export interface ZecatFamily {
  id: string | number
  name?: string
  title?: string
  description?: string
  show?: boolean
}

export interface ZecatProduct {
  id?: string | number
  code?: string | number
  sku?: string | number
  name?: string
  title?: string
  description?: string | null
  price?: number | string
  finalPrice?: number | string

  // stock/estado
  stock?: number
  available?: boolean


  families?: ZecatFamily[]

  // imágenes
  image?: string
  images?: Array<{
    id?: string | number
    image_url?: string
    url?: string
    main?: boolean
    [k: string]: any
  }>

  // atributos/variantes
  attributes?: Record<string, string[]>

  // otros campos opcionales de la API
  published?: boolean
  tag?: string
  [k: string]: any
}

export interface ZecatProductList {
  items?: ZecatProduct[]
  data?: ZecatProduct[]
  generic_products?: ZecatProduct[]
  genericProducts?: ZecatProduct[]
  total?: number
  count?: number
  total_pages?: number
}
