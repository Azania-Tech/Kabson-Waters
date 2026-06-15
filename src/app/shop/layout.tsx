import { CartProvider } from "@/context/CartContext";
import { ShopProductsProvider } from "@/context/ShopProductsContext";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopProductsProvider>
      <CartProvider>
        <div className="min-h-screen bg-slate-50">
          {children}
        </div>
      </CartProvider>
    </ShopProductsProvider>
  );
}
