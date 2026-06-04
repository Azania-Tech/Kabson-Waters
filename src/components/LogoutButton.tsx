"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function LogoutButton({ isIconOnly = false }: { isIconOnly?: boolean }) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (isIconOnly) {
    return (
      <button
        onClick={handleLogout}
        className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors"
        title="Sign Out"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-rose-500 text-white rounded-lg font-semibold hover:bg-rose-600 text-sm"
    >
      Sign Out
    </button>
  );
}
