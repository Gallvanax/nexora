"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { NexoraLogo } from "@/components/shared/nexora-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CommandPalette } from "@/components/shared/command-palette";
import { Button } from "@/components/ui/button";

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: string | null;
}

export interface ShellWorkspace {
  id: string;
  name: string;
  role: string;
}

const NAV_ITEMS = [
  { href: "/tableau-de-bord", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/projets", label: "Mes projets", icon: FolderKanban },
  { href: "/taches", label: "Mes tâches", icon: CheckSquare },
  { href: "/calendrier", label: "Calendrier", icon: Calendar },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/equipe", label: "Équipe", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

function subscribeSidebarStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("nexora:sidebar-change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("nexora:sidebar-change", cb);
  };
}

function getSidebarSnapshot(): boolean {
  return window.localStorage.getItem("nexora_sidebar_collapsed") === "true";
}

export function DashboardShell({
  user,
  workspaces,
  unreadNotifications,
  children,
}: {
  user: ShellUser;
  workspaces: ShellWorkspace[];
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = React.useSyncExternalStore(
    subscribeSidebarStorage,
    getSidebarSnapshot,
    () => false
  );
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    window.localStorage.setItem("nexora_sidebar_collapsed", String(next));
    window.dispatchEvent(new Event("nexora:sidebar-change"));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Déconnexion effectuée.");
      router.push("/connexion");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la déconnexion.");
      setLoggingOut(false);
    }
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent("nexora:open-command-palette"));
  };

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 space-y-1 px-2.5 py-4" aria-label="Navigation espace de travail">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/tableau-de-bord" && pathname.startsWith(`${item.href}/`));
        const showBadge = item.href === "/notifications" && unreadNotifications > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (isMobile) setMobileOpen(false);
            }}
            title={collapsed && !isMobile ? item.label : undefined}
            className={cn(
              "group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-gradient-to-r from-[#7C3AED]/20 to-[#3B82F6]/15 text-foreground border border-[#7C3AED]/40"
                : "text-muted-foreground hover:bg-elevated/80 hover:text-foreground border border-transparent"
            )}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-[#22D3EE]" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed || isMobile ? <span className="truncate">{item.label}</span> : null}
            </span>
            {showBadge ? (
              <span className="rounded-full bg-[#7C3AED] px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <CommandPalette />

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 border-r border-border-subtle bg-secondary-surface transition-all duration-200 sticky top-0 h-screen",
          collapsed ? "w-[76px]" : "w-[260px]"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border-subtle">
          <Link href="/tableau-de-bord" className="overflow-hidden">
            <NexoraLogo showText={!collapsed} size="sm" />
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-elevated hover:text-foreground cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && workspaces[0] ? (
          <div className="mx-3 mt-3 rounded-xl border border-border-subtle bg-card/70 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Espace actif
            </p>
            <p className="text-xs font-semibold text-foreground truncate">{workspaces[0].name}</p>
          </div>
        ) : null}

        {renderNavLinks(false)}

        <div className="border-t border-border-subtle p-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white">
              {getInitials(user.name)}
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            isLoading={loggingOut}
            className="w-full justify-start text-muted-foreground hover:text-danger"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>Déconnexion</span> : null}
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-secondary-surface border-r border-border-strong h-full">
            <div className="flex h-16 items-center justify-between px-4 border-b border-border-subtle">
              <NexoraLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-elevated cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(true)}
            <div className="border-t border-border-subtle p-4">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="w-full"
                onClick={handleLogout}
                isLoading={loggingOut}
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border-subtle nexora-glass px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir la navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <button
              type="button"
              onClick={openCommandPalette}
              className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-secondary-surface/80 px-3 py-1.5 text-xs text-muted-foreground hover:border-border-strong hover:text-foreground transition cursor-pointer w-48 sm:w-72"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1 text-left">Rechercher…</span>
              <kbd className="hidden sm:inline rounded border border-border-strong px-1.5 py-0.5 text-[10px] font-mono">
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle persist />
            <Link
              href="/notifications"
              className="relative rounded-xl p-2 text-muted-foreground hover:bg-elevated hover:text-foreground transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#22D3EE]" />
              ) : null}
            </Link>
            <Link
              href="/parametres"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-2.5 py-1.5 text-xs font-medium hover:border-border-strong"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7C3AED] text-[10px] font-bold text-white">
                {getInitials(user.name)}
              </span>
              <span className="max-w-[120px] truncate">{user.name}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
