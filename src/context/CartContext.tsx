"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types";
import { getPriceForSaleKind, type SaleKind } from "@/lib/pricing";

export interface CartItem extends Product {
  quantity: number;
  saleKind: SaleKind;
  lineId: string;
  unitPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, saleKind?: SaleKind, quantity?: number) => void;
  removeFromCart: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function cartLineId(productId: string, saleKind: SaleKind) {
  return `${productId}:${saleKind}`;
}

function resolveSaleKind(product: Product, saleKind?: SaleKind): SaleKind {
  if (saleKind) return saleKind;
  if (product.unit === "pack") return "wholesale";
  if (product.unit === "refill") return "refill";
  return "retail";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kabson-cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("kabson-cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const addToCart = (product: Product, saleKind?: SaleKind, quantity = 1) => {
    const kind = resolveSaleKind(product, saleKind);
    const lineId = cartLineId(product.id, kind);
    const unitPrice = getPriceForSaleKind(product, kind);
    setCart((prev) => {
      const exists = prev.find((item) => item.lineId === lineId);
      if (exists) {
        return prev.map((item) =>
          item.lineId === lineId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity, saleKind: kind, lineId, unitPrice }];
    });
  };

  const removeFromCart = (lineId: string) =>
    setCart((prev) => prev.filter((item) => item.lineId !== lineId));

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity < 1) { removeFromCart(lineId); return; }
    setCart((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const getTotalPrice = () =>
    cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
