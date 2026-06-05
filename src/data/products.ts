// src/data/products.ts
import { Product } from '@/types';

export const products: Product[] = [
  {
    id: "1",
    name: "Kabson 20L Jerry Can",
    description: "Premium purified drinking water in 20L jerry can. Perfect for home and office use.",
    price: 250,
    wholesalePrice: 220,
    image: "/images/products/20l.jpg",
    category: "Large",
    size: "20L",
    unit: "can",
    stock: 45,
    featured: true,
    isActive: true,
  },
  {
    id: "2",
    name: "Kabson 5L Bottle",
    description: "Fresh and clean drinking water in 5L bottle. Ideal for small families.",
    price: 80,
    wholesalePrice: 70,
    image: "/images/products/5l.jpg",
    category: "Medium",
    size: "5L",
    unit: "bottle",
    stock: 120,
    featured: true,
    isActive: true,
  },
  {
    id: "3",
    name: "Kabson 1L Bottles (Pack of 6)",
    description: "Convenient 1L bottles perfect for daily use and on-the-go.",
    price: 300,
    wholesalePrice: 260,
    image: "/images/products/1l-pack.jpg",
    category: "Small",
    size: "1L × 6",
    unit: "pack",
    stock: 85,
    isActive: true,
  },
  {
    id: "4",
    name: "Kabson 500ml Bottles (Pack of 12)",
    description: "Small portable bottles great for events, schools and offices.",
    price: 450,
    wholesalePrice: 390,
    image: "/images/products/500ml-pack.jpg",
    category: "Small",
    size: "500ml × 12",
    unit: "pack",
    stock: 65,
    isActive: true,
  },
  {
    id: "5",
    name: "Kabson 20L Refill Only",
    description: "Refill your existing 20L jerry can. Eco-friendly option.",
    price: 180,
    wholesalePrice: 160,
    image: "/images/products/refill.jpg",
    category: "Large",
    size: "20L",
    unit: "refill",
    stock: 200,
    featured: true,
    isActive: true,
  },
];

// Helper functions
export const getFeaturedProducts = () => products.filter(p => p.featured);
export const getProductsByCategory = (category: string) => 
  products.filter(p => p.category === category);

export default products;