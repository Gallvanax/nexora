"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Calendar,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
  Target,
  Users,
} from "lucide-react";

interface SearchResults {
  projects: Array<{ id: string; name: string; color: string; status: string }>;
  tasks: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    projectId: string;
    project: { name: string };
  }>;
  events: Array<{ id: string; title: string; startAt: string }>;
  goals: Array<{
    id: string;
    title: string;
    currentValue: number;
    targetValue: number;
    unit: string;
  }>;
}

const QUICK_ROUTES = [
  { label: "Vue d'ensemble", href: "/tableau-de-bord", icon: LayoutDashboard },
  { label: "Mes projets", href: "/projets", icon: FolderKanban },
  { label: "Mes tâches", href: "/taches", icon: CheckSquare },
  { label: "Calendrier", href: "/calendrier", icon: Calendar },
  { label: "Objectifs", href: "/objectifs", icon: Target },
  { label: "Statistiques", href: "/statistiques", icon: BarChart3 },
  { label: "Équipe", href: "/equipe", icon: Users },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Paramètres", href: "/parametres", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const closePalette = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(null);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            setQuery("");
            setResults(null);
            return false;
          }
          return true;
        });
      } else if (e.key === "Escape") {
        closePalette();
      }
    };
    const onCustomOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("nexora:open-command-palette", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("nexora:open-command-palette", onCustomOpen);
    };
  }, [closePalette]);

  React.useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          setResults(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(handle);
  }, [query, open]);

  const navigate = (href: string) => {
    closePalette();
    router.push(href);
  };

  const filteredRoutes = query.trim()
    ? QUICK_ROUTES.filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase()))
    : QUICK_ROUTES;

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Palette de commandes"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePalette}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-secondary-surface shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  if (!val.trim()) setResults(null);
                }}
                placeholder="Rechercher un projet, une tâche, une page…"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Rechercher dans NEXORA"
              />
              <kbd className="rounded-md border border-border-strong px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                Échap
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
              {loading ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Recherche en cours…</p>
              ) : null}

              {results && results.projects.length > 0 ? (
                <div>
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Projets
                  </p>
                  {results.projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/projets/${p.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-elevated cursor-pointer"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-medium text-foreground">{p.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {results && results.tasks.length > 0 ? (
                <div>
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tâches
                  </p>
                  {results.tasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate(`/projets/${t.projectId}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-elevated cursor-pointer"
                    >
                      <span className="truncate">
                        <span className="mr-2 font-mono text-xs text-[#22D3EE]">{t.code}</span>
                        <span className="text-foreground">{t.title}</span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t.project.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {results && results.goals.length > 0 ? (
                <div>
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Objectifs
                  </p>
                  {results.goals.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => navigate("/objectifs")}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-elevated cursor-pointer"
                    >
                      <span className="text-foreground truncate">{g.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {g.currentValue}/{g.targetValue} {g.unit}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div>
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Navigation rapide
                </p>
                {filteredRoutes.map((route) => {
                  const Icon = route.icon;
                  return (
                    <button
                      key={route.href}
                      type="button"
                      onClick={() => navigate(route.href)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-elevated cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{route.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
