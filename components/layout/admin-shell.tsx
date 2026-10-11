"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { ADMIN_NAV } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminDashboard } from "@/lib/services/admin";
import { adminLogout } from "@/lib/services/auth";

function AdminBrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#F5B942" />
      <path d="M9 22.5V9.5h3.4l6.2 8.6V9.5H22V22.5h-3.4l-6.2-8.6v8.6H9Z" fill="#071426" />
    </svg>
  );
}

function AdminSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center gap-2.5 border-b border-border px-5", collapsed && "justify-center px-0")}>
        <Link href="/admin" aria-label="Admin home" className="flex items-center gap-2.5">
          <AdminBrandMark />
          {!collapsed && (
            <span className="text-sm font-extrabold tracking-tight">
              Zentra <span className="text-muted-foreground">Admin</span>
            </span>
          )}
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin" aria-label="Admin">
        {ADMIN_NAV.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors",
                active ? "bg-gold/15 text-gold-foreground dark:text-gold" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "hidden w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-secondary lg:flex",
            collapsed && "justify-center px-0"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { value: collapsed, setValue: setCollapsed } = useLocalStorage("zentra-admin-collapsed", false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { data: summary } = useApiQuery(["admin", "shell-dashboard"], getAdminDashboard, {
    refetchInterval: 60_000,
  });

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const current = ADMIN_NAV.find(
    (n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href))
  );
  const pageTitle = current?.label ?? "Admin";

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card transition-[width] duration-200 lg:block",
            collapsed && "w-[72px]"
          )}
        >
          <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </aside>
      )}

      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-brand-deep/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
            <AdminSidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200", !isMobile && collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold">{pageTitle}</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Operations console · live database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DemoDataBadge />
            <Badge variant="outline" className="hidden gap-1.5 border-gold/40 text-gold-foreground dark:text-gold sm:inline-flex">
              <ShieldCheck className="size-3" />
              Staff mode
            </Badge>
            <Button variant="ghost" size="icon-sm" className="relative" aria-label="Alerts">
              <Bell />
              {(summary?.pendingWithdrawals ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
              )}
            </Button>
            <Button asChild variant="ghost" size="icon-sm" aria-label="Help" className="hidden sm:inline-flex">
              <Link href="/support">
                <LifeBuoy />
              </Link>
            </Button>
            <div className="flex items-center gap-2.5 rounded-full border border-border py-1 pr-1 pl-1.5">
              <Avatar className="size-7">
                <AvatarFallback className="bg-gold text-xs font-bold text-brand-deep">SM</AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-bold md:block">Sarah Mutua</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer"
                aria-label="Log out"
                onClick={async () => {
                  await adminLogout();
                  router.push("/admin/login");
                }}
              >
                <LogOut />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-16 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export { Input, Badge, X, Search };
