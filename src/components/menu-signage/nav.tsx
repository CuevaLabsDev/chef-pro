"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface MenuSignageNavProps {
  user: {
    name: string;
    role: string;
    canManageStructure: boolean;
    canExecute: boolean;
    canPublish: boolean;
    canFinalizeService: boolean;
    canManageKitchenAdmins: boolean;
    canViewAsKitchenAdmin: boolean;
    canManagePermissions: boolean;
  };
}

export function MenuSignageNav({ user }: MenuSignageNavProps) {
  const pathname = usePathname();
  const links = [
    { href: "/menu-signage", label: "Menu Signage" },
    ...(user.canManageStructure ? [{ href: "/menu-signage/new", label: "Create Menu" }] : []),
    { href: "/menu-signage/review", label: "Review" },
    ...(user.canManageKitchenAdmins ? [{ href: "/menu-signage", label: "Team Support" }] : []),
    ...(user.canManagePermissions ? [{ href: "/ops/permissions", label: "Permissions" }] : []),
    ...(user.canExecute ? [{ href: "/chef/dashboard", label: "Tastings" }] : []),
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <Link href="/menu-signage" className="text-lg font-bold text-primary">
            ChefPro <span className="text-xs font-normal text-muted-foreground">Menu Signage</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {links.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
          {links.map((link, i) => (
            <Link
              key={`${link.href}-${i}`}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
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
