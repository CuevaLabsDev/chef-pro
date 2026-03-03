"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface OpsNavProps {
  user: {
    name: string;
    role: string;
    canManagePermissions: boolean;
  };
}

export function OpsNav({ user }: OpsNavProps) {
  const pathname = usePathname();
  const links = [
    { href: "/ops/dashboard", label: "Dashboard" },
    { href: "/ops/reviews", label: "Reviews" },
    { href: "/ops/config/locations", label: "Config" },
    { href: "/ops/reports", label: "Reports" },
    { href: "/ops/notifications", label: "Alerts" },
    { href: "/packets", label: "Packets" },
    ...(user.canManagePermissions ? [{ href: "/ops/permissions", label: "Permissions" }] : []),
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/ops/dashboard" className="text-lg font-bold text-indigo-600">
            ChefPro <span className="text-xs font-normal text-gray-400">Ops</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(link.href)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                pathname.startsWith(link.href)
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
