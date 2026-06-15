"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function ShopNavbar() {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/shop" className="flex items-center gap-2.5">
          <div className="w-8 h-8 relative">
            <Image src="/logo/kabson-waters-logo.svg" alt="Kabson Waters" fill className="object-contain" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 leading-none">Kabson Waters</p>
            <p className="text-[10px] text-slate-400">Pure · Fresh · Reliable</p>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <Link href="/shop" className="hover:text-blue-600 transition">Home</Link>
          <Link href="/shop/products" className="hover:text-blue-600 transition">Products</Link>
          <Link href="/" className="hover:text-blue-600 transition">Dashboard</Link>
        </div>

        {/* Cart + mobile toggle */}
        <div className="flex items-center gap-3">
          <Link href="/shop/cart" className="relative p-2 rounded-xl hover:bg-slate-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full">
                {totalItems}
              </span>
            )}
          </Link>
          <button onClick={() => setOpen((v) => !v)} className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition">
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {[["Shop", "/shop"], ["Products", "/shop/products"], ["Dashboard", "/"]].map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
