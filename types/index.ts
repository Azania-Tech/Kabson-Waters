// src/types/index.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  wholesalePrice?: number;
  image: string;
  category: string;
  size: string;
  unit: string;
  stock: number;
  featured?: boolean;
  isActive: boolean;
}