"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock, Package, LogOut } from "lucide-react";

interface ChefNavProps {
  user: { name: string; role: string; canReadPackets: boolean };
}

export function ChefNav({ user }: ChefNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/chef/dashboard", label: "Today", icon: CalendarDays },
    { href: "/chef/tastings/history", label: "History", icon: Clock },
    ...(user.canReadPackets
      ? [{ href: "/menu-signage/review", label: "Menu Signage", icon: Package }]
      : []),
  ];

  return (
    <>
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/chef/dashboard" className="text-lg font-bold text-primary">
            ChefPro
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-5", active && "text-primary")} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
