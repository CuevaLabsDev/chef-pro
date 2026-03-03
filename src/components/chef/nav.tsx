"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface ChefNavProps {
  user: { name: string; role: string; canReadPackets: boolean };
}

export function ChefNav({ user }: ChefNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/chef/dashboard", label: "Today" },
    { href: "/chef/tastings/new", label: "New" },
    { href: "/chef/tastings/history", label: "History" },
    ...(user.canReadPackets ? [{ href: "/packets", label: "Packets" }] : []),
  ];

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/chef/dashboard" className="text-lg font-bold text-indigo-600">
            ChefPro
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex-1 py-3 text-center text-xs font-medium transition-colors",
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-indigo-600 border-t-2 border-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
