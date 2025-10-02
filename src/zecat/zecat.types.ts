// src/zecat/types.ts
export interface ZecatCategory {
  id?: string | number;
  name?: string;
  imageUrl?: string | null;
}

export interface ZecatProduct {
  id?: string | number;
  code?: string | number;
  sku?: string | number;
  name?: string;
  title?: string;
  description?: string | null;
  price?: number | string;
  finalPrice?: number | string;

  // stock/estado
  stock?: number;
  available?: boolean;

  // categoría
  categoryId?: string | number;
  categoryName?: string;

  // imágenes
  image?: string;
  images?: string[];

  // atributos/variantes
  attributes?: Record<string, string[]>;
}

export interface ZecatProductList {
  items?: ZecatProduct[];
  data?: ZecatProduct[];
  total?: number;
}
