"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { DASHBOARD_NAV, MOBILE_NAV } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTheme } from "@/hooks/use-theme";
import { useApiQuery } from "@/hooks/use-api";
import { getUnreadCount } from "@/lib/services/notifications";
import { getProfile } from "@/lib/services/profile";
import { logout } from "@/lib/services/auth";

const COMMANDS: { label: string; href: string; hint: string }[] = [
  { label: "Dashboard", href: "/dashboard", hint: "Overview" },
  { label: "Browse products", href: "/dashboard/products", hint: "Catalogue" },
  { label: "My investments", href: "/investments", hint: "Plans" },
  { label: "Add funds", href: "/wallet/deposit", hint: "M-Pesa" },
  { label: "Withdraw", href: "/wallet/withdraw", hint: "M-Pesa" },
  { label: "Wallet overview", href: "/wallet", hint: "Balances" },
  { label: "Team", href: "/team", hint: "Referrals" },
  { label: "Invite & referrals", href: "/team/referrals", hint: "Share" },
  { label: "Team rewards", href: "/team/rewards", hint: "Commissions" },
  { label: "Rewards & bonuses", href: "/dashboard/rewards", hint: "Bonuses" },
  { label: "Transaction records", href: "/records", hint: "History" },
  { label: "Support", href: "/support", hint: "Help" },
  { label: "Open a ticket", href: "/support/new", hint: "Support" },
  { label: "Profile", href: "/profile", hint: "Account" },
  { label: "Security centre", href: "/profile/security", hint: "Safety" },
  { label: "Verification", href: "/profile/verification", hint: "KYC" },
  { label: "Settings", href: "/profile/settings", hint: "Preferences" },
  { label: "Admin console", href: "/admin", hint: "Staff" },
];

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const results = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Search pages and actions</DialogDescription>
        </DialogHeader>
        <div className="border-b border-border">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="h-14 border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-2" role="listbox">
          {results.map((cmd) => (
            <li key={cmd.href}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-secondary"
                onClick={() => {
                  router.push(cmd.href);
                  onClose();
                }}
              >
                {cmd.label}
                <span className="text-xs font-medium text-muted-foreground">{cmd.hint}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">No matches found.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function QuickAction({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" className={cn("shadow-glow cursor-pointer", className)} aria-label="Quick actions">
          <Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href="/wallet/deposit">
            <Wallet /> Add funds
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wallet/withdraw">
            <Wallet /> Withdraw
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/products">
            <Zap /> Invest
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/team/referrals">
            <UserRound /> Invite
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationBell() {
  const { data: unread } = useApiQuery(["notifications", "unread"], getUnreadCount, {
    refetchInterval: 30_000,
  });
  return (
    <Button asChild variant="ghost" size="icon" className="relative cursor-pointer" aria-label="Notifications">
      <Link href="/notifications">
        <Bell />
        {(unread?.count ?? 0) > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
            {unread!.count > 9 ? "9+" : unread!.count}
          </span>
        )}
      </Link>
    </Button>
  );
}

function UserMenu() {
  const router = useRouter();
  const { data: user } = useApiQuery(["profile"], getProfile);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex cursor-pointer items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-secondary" aria-label="Account menu">
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand-deep text-xs text-white">
              {initials(user?.fullName ?? "NX")}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left lg:block">
            <span className="block text-xs font-bold">{user?.fullName ?? "Account"}</span>
            <span className="numeric block text-[10px] text-muted-foreground">{user?.accountNumber ?? ""}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="text-sm font-bold text-foreground">{user?.fullName}</p>
          <p className="numeric text-xs font-medium text-muted-foreground">{user?.accountNumber}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/support">
            <LifeBuoy /> Help centre
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center border-b border-brand-line px-5", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" aria-label="Dashboard home">
          {collapsed ? <LogoMarkSmall /> : <Logo light />}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin" aria-label="Dashboard">
        {DASHBOARD_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary/12 text-primary dark:text-primary"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
                collapsed && "justify-center px-0"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-brand-line p-3">
        <Link
          href="/support"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "justify-center px-0"
          )}
        >
          <LifeBuoy className="size-4.5" />
          {!collapsed && "Help centre"}
        </Link>
        <Link
          href="/profile/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className="size-4.5" />
          {!collapsed && "Settings"}
        </Link>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "hidden w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-white/40 transition-colors hover:bg-white/5 hover:text-white lg:flex",
              collapsed && "justify-center px-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4.5" /> : <ChevronsLeft className="size-4.5" />}
            {!collapsed && "Collapse"}
          </button>
        )}
      </div>
    </div>
  );
}

function LogoMarkSmall() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#10B981" />
      <path d="M9 22.5V9.5h3.4l6.2 8.6V9.5H22V22.5h-3.4l-6.2-8.6v8.6H9Z" fill="#FFFFFF" />
    </svg>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors",
                active ? "text-brand-deep dark:text-primary" : "text-muted-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DashboardShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { value: collapsed, setValue: setCollapsed } = useLocalStorage("zentra-sidebar-collapsed", false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const currentNav = DASHBOARD_NAV.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`)
  );
  const pageTitle = title ?? currentNav?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-brand-line bg-brand-deep transition-[width] duration-200 lg:block",
            collapsed && "w-[76px]"
          )}
        >
          <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        </aside>
      )}

      <div className={cn("transition-[padding] duration-200", !isMobile && collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {isMobile ? (
              <Link href="/dashboard" aria-label="Home" className="shrink-0">
                <LogoMarkSmall />
              </Link>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                className="hidden cursor-pointer lg:inline-flex"
                onClick={() => setCollapsed((c) => !c)}
                aria-label="Toggle sidebar"
              >
                <Menu />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
              aria-label="Open command palette"
            >
              <Search className="size-4" />
              <span className="pr-8">Search…</span>
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold">⌘K</kbd>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              className="cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <NotificationBell />
            <QuickAction className="hidden sm:inline-flex lg:hidden" />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:pb-14">{children}</main>
      </div>

      {!isMobile && (
        <div className="fixed right-6 bottom-6 z-30 hidden lg:block">
          <QuickAction />
        </div>
      )}

      {isMobile && (
        <>
          <div className="fixed right-4 bottom-20 z-40 lg:hidden">
            <QuickAction />
          </div>
          <MobileBottomNav />
        </>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export { Separator, Badge, Input };
