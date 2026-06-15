import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <div className="relative bg-gradient-to-br from-[#003d8f] via-[#0057c8] to-[#0099e6] text-white py-24 overflow-hidden">
      {/* Wave background */}
      <div className="absolute inset-0 opacity-10">
        <svg viewBox="0 0 1440 560" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          <path d="M0,280 C240,200 480,360 720,280 C960,200 1200,360 1440,280 L1440,560 L0,560 Z" fill="white"/>
          <path d="M0,350 C240,270 480,430 720,350 C960,270 1200,430 1440,350 L1440,560 L0,560 Z" fill="white" opacity="0.5"/>
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl -translate-y-1/3 translate-x-1/4" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 relative drop-shadow-xl">
            <Image src="/logo/kabson-waters-logo.svg" alt="Kabson Waters" fill className="object-contain brightness-0 invert" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm px-4 py-2 rounded-full mb-6 backdrop-blur-sm font-semibold">
          💧 Nairobi's Most Trusted Water Brand
        </div>

        <h1 className="text-5xl md:text-6xl font-black mb-5 leading-tight">
          Pure Water.<br />
          <span className="text-cyan-300">Delivered Fresh.</span>
        </h1>

        <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-7">
          Premium purified drinking water for your home, office, and events.
          Fast and reliable delivery across Nairobi.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/shop/products"
            className="bg-white text-blue-700 px-8 py-4 rounded-full text-base font-bold hover:bg-cyan-50 transition shadow-lg shadow-blue-900/20">
            Browse Products
          </Link>
          <Link href="/shop/cart"
            className="border-2 border-white/50 hover:bg-white/10 px-8 py-4 rounded-full text-base font-semibold transition">
            View Cart
          </Link>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="relative h-12 overflow-hidden mt-16">
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path d="M0,24 C360,48 1080,0 1440,24 L1440,48 L0,48 Z" fill="#f8fbff"/>
        </svg>
      </div>
    </div>
  );
}
