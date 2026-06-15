export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  retailPrice?: number;
  wholesalePrice?: number;
  refillPrice?: number;
  customerOrderPrice?: number; // price per pack for production customer orders (e.g. 1L = KES 600)
  image?: string;
  category: string;
  size: string;
  unit: string;
  stock: number;
  featured?: boolean;
  isActive: boolean;
};
