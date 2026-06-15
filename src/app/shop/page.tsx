"use client";

import ShopNavbar from "@/components/layout/Navbar";
import Hero from "@/components/layout/Hero";
import ProductGrid from "@/components/products/ProductGrid";
import { useShopProducts } from "@/context/ShopProductsContext";

export default function ShopHomePage() {
  const { products, loading } = useShopProducts();
  const featured = products.filter((p) => p.featured);

  return (
    <>
      <ShopNavbar />
      <Hero />

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600 mb-2">Top picks</p>
          <h2 className="text-3xl font-black text-slate-900">Featured Products</h2>
          <p className="text-slate-500 mt-2">Our most popular water products</p>
        </div>
        {loading ? (
          <p className="text-center text-slate-400 py-12">Loading products...</p>
        ) : (
          <ProductGrid products={featured} />
        )}
      </section>

      {/* All products */}
      <section className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600 mb-2">Full range</p>
            <h2 className="text-3xl font-black text-slate-900">All Products</h2>
            <p className="text-slate-500 mt-2">Choose the perfect size for your needs</p>
          </div>
          {loading ? (
            <p className="text-center text-slate-400 py-12">Loading products...</p>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </section>

      {/* Why us */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: "💧", title: "100% Pure Water", desc: "Treated and tested to the highest standards for your safety." },
            { icon: "🚚", title: "Fast Delivery", desc: "Same-day delivery across Nairobi and surrounding areas." },
            { icon: "♻️", title: "Eco Friendly", desc: "Recyclable packaging and a refill programme to reduce waste." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <span className="text-4xl">{f.icon}</span>
              <p className="mt-3 font-black text-slate-900">{f.title}</p>
              <p className="mt-2 text-sm text-slate-500 leading-6">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Kabson Waters. All rights reserved.
      </footer>
    </>
  );
}
