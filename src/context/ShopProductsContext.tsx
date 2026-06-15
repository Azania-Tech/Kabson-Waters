"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/types";
import { seedShopProductsIfEmpty, subscribeToShopProducts } from "@/lib/commerce";
import { products as defaultProducts } from "@/data/products";

interface ShopProductsContextType {
  products: Product[];
  loading: boolean;
}

const ShopProductsContext = createContext<ShopProductsContextType | undefined>(undefined);

export function ShopProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    (async () => {
      try {
        await seedShopProductsIfEmpty(
          defaultProducts.map(({ id: _id, ...product }) => product)
        );
      } catch {
        // Fall back to live subscription even if seed fails
      }
      if (!active) return;
      unsubscribe = subscribeToShopProducts((next) => {
        setProducts(next.filter((p) => p.isActive !== false));
        setLoading(false);
      });
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <ShopProductsContext.Provider value={{ products, loading }}>
      {children}
    </ShopProductsContext.Provider>
  );
}

export function useShopProducts() {
  const context = useContext(ShopProductsContext);
  if (!context) {
    throw new Error("useShopProducts must be used within ShopProductsProvider");
  }
  return context;
}
