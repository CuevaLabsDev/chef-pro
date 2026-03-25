"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  BarChart3,
  Package,
  Shield,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  User,
  CalendarDays,
  Clock,
  Eye,
  Bell,
  Timer,
  SlidersHorizontal,
  Star,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey?: string;
}

interface AppSidebarProps {
  user: {
    name: string;
    role: string;
    permissionKeys: string[];
  };
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/ops/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permissionKey: "reviews.manage",
  },
  { href: "/ops/reviews", label: "Reviews", icon: ClipboardCheck, permissionKey: "reviews.manage" },
  { href: "/chef/dashboard", label: "Today", icon: CalendarDays, permissionKey: "tastings.create" },
  {
    href: "/chef/tastings/history",
    label: "Tasting History",
    icon: Clock,
    permissionKey: "tastings.create",
  },
  {
    href: "/menu-signage",
    label: "Menu Signage",
    icon: Package,
    permissionKey: "packets.manage_structure",
  },
  {
    href: "/menu-signage/review",
    label: "Review Menus",
    icon: Eye,
    permissionKey: "packets.execute",
  },
  {
    href: "/menu-signage/amendments",
    label: "Amendments",
    icon: FileEdit,
    permissionKey: "packets.execute",
  },
  {
    href: "/ops/config/locations",
    label: "Cafe / Concept",
    icon: Building2,
    permissionKey: "config.manage",
  },
  {
    href: "/ops/config/deadlines",
    label: "Deadlines",
    icon: Timer,
    permissionKey: "config.manage",
  },
  {
    href: "/ops/config/periods",
    label: "Periods",
    icon: SlidersHorizontal,
    permissionKey: "config.manage",
  },
  {
    href: "/ops/config/schema",
    label: "Rating Schema",
    icon: Star,
    permissionKey: "config.manage",
  },
  { href: "/ops/reports", label: "Reports", icon: BarChart3, permissionKey: "reports.view" },
  {
    href: "/ops/notifications",
    label: "Notifications",
    icon: Bell,
    permissionKey: "reviews.manage",
  },
  {
    href: "/ops/permissions",
    label: "Permissions",
    icon: Shield,
    permissionKey: "permissions.manage",
  },
];

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-accent text-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function SidebarContent({
  user,
  visibleItems,
  collapsed,
  onToggle,
}: {
  user: AppSidebarProps["user"];
  visibleItems: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const roleLabel = user.role.replace("_", " ");

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-sidebar-border px-4 h-14 shrink-0",
          collapsed && "justify-center px-2"
        )}
      >
        {!collapsed && (
          <Link href={visibleItems[0]?.href ?? "/"} className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              CP
            </div>
            <span className="text-base font-semibold text-sidebar-foreground">ChefPro</span>
          </Link>
        )}
        {collapsed && (
          <Link
            href={visibleItems[0]?.href ?? "/"}
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold"
          >
            CP
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <TooltipProvider delayDuration={0}>
          {visibleItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
              collapsed={collapsed}
            />
          ))}
        </TooltipProvider>
      </nav>

      <div
        className={cn("border-t border-sidebar-border px-3 py-3 space-y-2", collapsed && "px-2")}
      >
        <ThemeToggle collapsed={collapsed} />

        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                {roleLabel}
              </Badge>
            </div>
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto cursor-default">
                  <User className="size-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {user.name} ({roleLabel})
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2 text-muted-foreground hover:text-destructive",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2 text-muted-foreground",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </div>
  );
}

function MobileSidebar({
  user,
  visibleItems,
}: {
  user: AppSidebarProps["user"];
  visibleItems: NavItem[];
}) {
  const pathname = usePathname();
  const roleLabel = user.role.replace("_", " ");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-sidebar-border px-4 h-14 flex flex-row items-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            CP
          </div>
          <SheetTitle className="text-base font-semibold">ChefPro</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border px-4 py-4 space-y-3">
          <ThemeToggle />
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
            <User className="size-4" />
            <span>{user.name}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize ml-auto">
              {roleLabel}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permissionKey || user.permissionKeys.includes(item.permissionKey)
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div
          className={cn(
            "fixed top-0 bottom-0 transition-all duration-200",
            collapsed ? "w-16" : "w-64"
          )}
        >
          <SidebarContent
            user={user}
            visibleItems={visibleItems}
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-50 flex items-center gap-3 border-b border-border bg-card px-4 h-14">
        <MobileSidebar user={user} visibleItems={visibleItems} />
        <Link href={visibleItems[0]?.href ?? "/"} className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            CP
          </div>
          <span className="text-base font-semibold text-foreground">ChefPro</span>
        </Link>
      </header>
    </>
  );
}
