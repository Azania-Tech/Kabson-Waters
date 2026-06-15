"use client";

import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { getRetailPrice, getWholesalePrice, getRefillPrice } from "@/lib/pricing";

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, cart } = useCart();
  const inCart = cart.filter((i) => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
  const retailPrice = getRetailPrice(product);
  const wholesalePrice = getWholesalePrice(product);
  const refillPrice = getRefillPrice(product);
  const isPack = product.unit === "pack";
  const isRefillOnly = product.unit === "refill";

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 transition-all duration-200 hover:-translate-y-0.5">
      <div className="relative h-44 bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-16 h-16 fill-white opacity-90">
          <path d="M12 2C8.5 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3.5-7-7-12z"/>
        </svg>
        {product.featured && (
          <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
            Featured
          </span>
        )}
        <span className="absolute top-3 right-3 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {product.size}
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-0.5">{product.category}</p>
        <h3 className="font-bold text-slate-900 text-base leading-tight">{product.name}</h3>
        <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{product.description}</p>

        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-2xl font-black text-slate-900">
              KES {(isPack ? wholesalePrice : isRefillOnly ? refillPrice : retailPrice).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">
              {isPack ? "wholesale pack" : isRefillOnly ? "refill" : `retail · pack KES ${wholesalePrice.toLocaleString()}`}
            </p>
          </div>
          <span className={`text-xs font-semibold ${product.stock > 10 ? "text-emerald-600" : product.stock > 0 ? "text-amber-600" : "text-rose-600"}`}>
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>

        {inCart > 0 && (
          <p className="mt-3 text-sm font-semibold text-blue-700">{inCart} in cart</p>
        )}

        <div className="mt-3 space-y-2">
          {isRefillOnly ? (
            <button
              onClick={() => addToCart(product, "refill")}
              disabled={product.stock === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {product.stock === 0 ? "Out of stock" : `Add refill · KES ${refillPrice.toLocaleString()}`}
            </button>
          ) : isPack ? (
            <button
              onClick={() => addToCart(product, "wholesale")}
              disabled={product.stock === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {product.stock === 0 ? "Out of stock" : `Add pack · KES ${wholesalePrice.toLocaleString()}`}
            </button>
          ) : (
            <>
              <button
                onClick={() => addToCart(product, "retail")}
                disabled={product.stock === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                {product.stock === 0 ? "Out of stock" : `Add bottle · KES ${retailPrice.toLocaleString()}`}
              </button>
              <button
                onClick={() => addToCart(product, "refill")}
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-2.5 rounded-xl transition text-sm border border-purple-200"
              >
                Add refill · KES {refillPrice.toLocaleString()}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
