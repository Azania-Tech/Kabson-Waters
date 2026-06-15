"use client";

import ShopNavbar from "@/components/layout/Navbar";
import ProductGrid from "@/components/products/ProductGrid";
import { useShopProducts } from "@/context/ShopProductsContext";
import { useState, useMemo } from "react";

export default function ProductsPage() {
  const { products, loading } = useShopProducts();
  const [selectedCat, setSelectedCat] = useState("All");
  const [search, setSearch] = useState("");

  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category))],
    [products]
  );

  const filtered = useMemo(() =>
    products.filter((p) =>
      (selectedCat === "All" || p.category === selectedCat) &&
      p.name.toLowerCase().includes(search.toLowerCase())
    ), [products, selectedCat, search]);

  return (
    <>
      <ShopNavbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600 mb-2">Our range</p>
          <h1 className="text-4xl font-black text-slate-900">All Products</h1>
          <p className="text-slate-500 mt-2">Premium purified drinking water in every size</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white transition" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCat(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCat === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-20">Loading products...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">No products found</p>
          </div>
        ) : (
          <ProductGrid products={filtered} />
        )}
      </div>
    </>
  );
}
