import { Product } from 'src/domain/entities/product.entity';

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  embedding: number[] | null;
  created_at: Date;
  updated_at: Date;
};

export const toProductEntity = (row: ProductRow): Product => {
  return new Product(
    row.id,
    row.name,
    row.description,
    row.category,
    new Date(row.created_at),
    new Date(row.updated_at),
    row.embedding ?? undefined,
  );
};
