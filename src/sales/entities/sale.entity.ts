import { Product, User } from '@prisma/client';

export class Sale {
  id: number;
  total: number;
  products: Product[];
  createdAt: Date;
  userId: number;
  user: User;
}
