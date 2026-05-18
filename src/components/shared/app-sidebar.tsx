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
  ChevronDown,
  Settings,
  Utensils,
  ClipboardList,
  Bot,
  ShieldCheck,
  Upload as UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface NavItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey?: string;
  children?: NavItem[];
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
    label: "Operations",
    icon: ClipboardCheck,
    children: [
      {
        href: "/ops/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        permissionKey: "reviews.manage",
      },
      {
        href: "/ops/reviews",
        label: "Reviews",
        icon: ClipboardCheck,
        permissionKey: "reviews.manage",
      },
    ],
  },
  {
    label: "Tastings",
    icon: Utensils,
    children: [
      {
        href: "/chef/dashboard",
        label: "Today",
        icon: CalendarDays,
        permissionKey: "tastings.create",
      },
      {
        href: "/chef/tastings/history",
        label: "History",
        icon: Clock,
        permissionKey: "tastings.create",
      },
    ],
  },
  {
    label: "Daily Counts",
    icon: ClipboardList,
    children: [
      { href: "/daily-counts", label: "Today", icon: CalendarDays, permissionKey: "counts.record" },
      {
        href: "/daily-counts/history",
        label: "History",
        icon: Clock,
        permissionKey: "counts.view",
      },
      {
        href: "/daily-counts/configure",
        label: "Setup",
        icon: SlidersHorizontal,
        permissionKey: "counts.configure",
      },
    ],
  },
  {
    label: "Compliance",
    icon: ShieldCheck,
    children: [
      {
        href: "/compliance",
        label: "Uploads",
        icon: UploadIcon,
        permissionKey: "compliance.record",
      },
      {
        href: "/ops/compliance",
        label: "Audits",
        icon: ShieldCheck,
        permissionKey: "compliance.view",
      },
    ],
  },
  {
    label: "Menu Signage",
    icon: Package,
    href: "/menu-signage",
    permissionKey: "packets.manage_structure",
    children: [
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
    ],
  },
  {
    label: "Configuration",
    icon: Settings,
    children: [
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
    ],
  },
  { href: "/ops/reports", label: "Reports", icon: BarChart3, permissionKey: "reports.view" },
  { href: "/ops/ai-assistant", label: "AI Assistant", icon: Bot, permissionKey: "reports.view" },
  {
    label: "System",
    icon: Shield,
    children: [
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
    ],
  },
];

function getVisibleChildren(item: NavItem, permissionKeys: string[]): NavItem[] {
  if (!item.children) return [];
  return item.children.filter(
    (child) => !child.permissionKey || permissionKeys.includes(child.permissionKey)
  );
}

function isGroupActive(item: NavItem, pathname: string): boolean {
  if (item.href && pathname.startsWith(item.href)) return true;
  return item.children?.some((child) => child.href && pathname.startsWith(child.href)) ?? false;
}

function SidebarLink({
  item,
  active,
  collapsed,
  indented,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  indented?: boolean;
}) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-accent text-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2",
        indented && !collapsed && "pl-10"
      )}
    >
      <Icon className={cn("shrink-0", indented ? "size-4" : "size-5")} />
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

function SidebarGroup({
  item,
  collapsed,
  pathname,
  permissionKeys,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  permissionKeys: string[];
}) {
  const visibleChildren = getVisibleChildren(item, permissionKeys);
  const groupActive = isGroupActive(item, pathname);
  const [open, setOpen] = useState(groupActive);

  const Icon = item.icon;
  const hasParentLink = !!item.href;
  const parentVisible = !item.permissionKey || permissionKeys.includes(item.permissionKey);

  if (visibleChildren.length === 0 && (!hasParentLink || !parentVisible)) return null;

  if (collapsed) {
    if (hasParentLink && parentVisible) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href!}
              className={cn(
                "flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all",
                groupActive
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center rounded-lg px-2 py-2.5 cursor-default",
              groupActive ? "text-accent-foreground" : "text-sidebar-foreground/70"
            )}
          >
            <Icon className="size-5 shrink-0" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          groupActive
            ? "text-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="size-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {hasParentLink && parentVisible && (
            <SidebarLink
              item={{ ...item, label: "Overview", children: undefined }}
              active={pathname === item.href}
              collapsed={false}
              indented
            />
          )}
          {visibleChildren.map((child) => (
            <SidebarLink
              key={child.href}
              item={child}
              active={child.href ? pathname.startsWith(child.href) : false}
              collapsed={false}
              indented
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  user,
  collapsed,
  onToggle,
}: {
  user: AppSidebarProps["user"];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const roleLabel = user.role.replace("_", " ");
  const defaultHref = getFirstVisibleHref(NAV_ITEMS, user.permissionKeys);

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-sidebar-border px-4 h-14 shrink-0",
          collapsed && "justify-center px-2"
        )}
      >
        {!collapsed && (
          <Link href={defaultHref} className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              CP
            </div>
            <span className="text-base font-semibold text-sidebar-foreground">ChefPro</span>
          </Link>
        )}
        {collapsed && (
          <Link
            href={defaultHref}
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold"
          >
            CP
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <TooltipProvider delayDuration={0}>
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              return (
                <SidebarGroup
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  permissionKeys={user.permissionKeys}
                />
              );
            }

            if (item.permissionKey && !user.permissionKeys.includes(item.permissionKey)) {
              return null;
            }

            return (
              <SidebarLink
                key={item.href}
                item={item}
                active={item.href ? pathname.startsWith(item.href) : false}
                collapsed={collapsed}
              />
            );
          })}
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

function MobileNavGroup({
  item,
  pathname,
  permissionKeys,
}: {
  item: NavItem;
  pathname: string;
  permissionKeys: string[];
}) {
  const visibleChildren = getVisibleChildren(item, permissionKeys);
  const groupActive = isGroupActive(item, pathname);
  const [open, setOpen] = useState(groupActive);

  const Icon = item.icon;
  const hasParentLink = !!item.href;
  const parentVisible = !item.permissionKey || permissionKeys.includes(item.permissionKey);

  if (visibleChildren.length === 0 && (!hasParentLink || !parentVisible)) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          groupActive
            ? "text-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="size-5" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {hasParentLink && parentVisible && (
            <Link
              href={item.href!}
              className={cn(
                "flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              Overview
            </Link>
          )}
          {visibleChildren.map((child) => {
            const ChildIcon = child.icon;
            const active = child.href ? pathname.startsWith(child.href) : false;
            return (
              <Link
                key={child.href}
                href={child.href!}
                className={cn(
                  "flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <ChildIcon className="size-4" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileSidebar({ user }: { user: AppSidebarProps["user"] }) {
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
        <SheetHeader className="flex h-14 shrink-0 flex-row items-center justify-center gap-2 border-b border-sidebar-border p-0 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            CP
          </div>
          <SheetTitle className="text-base font-semibold leading-none">ChefPro</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              return (
                <MobileNavGroup
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  permissionKeys={user.permissionKeys}
                />
              );
            }

            if (item.permissionKey && !user.permissionKeys.includes(item.permissionKey)) {
              return null;
            }

            const Icon = item.icon;
            const active = item.href ? pathname.startsWith(item.href) : false;
            return (
              <Link
                key={item.href}
                href={item.href!}
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

function getFirstVisibleHref(items: NavItem[], permissionKeys: string[]): string {
  for (const item of items) {
    if (item.href && (!item.permissionKey || permissionKeys.includes(item.permissionKey))) {
      return item.href;
    }
    if (item.children) {
      const childHref = getFirstVisibleHref(item.children, permissionKeys);
      if (childHref !== "/") return childHref;
    }
  }
  return "/";
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const defaultHref = getFirstVisibleHref(NAV_ITEMS, user.permissionKeys);

  return (
    <>
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
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-50 flex w-full shrink-0 items-center gap-3 border-b border-border bg-card px-4 h-14">
        <MobileSidebar user={user} />
        <Link href={defaultHref} className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            CP
          </div>
          <span className="text-base font-semibold text-foreground">ChefPro</span>
        </Link>
      </header>
    </>
  );
}
