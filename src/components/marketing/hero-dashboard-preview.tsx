"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock, FolderKanban, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PREVIEW_TASKS = [
  {
    id: "1",
    code: "NX-14",
    title: "Architecture API & permissions RBAC",
    tag: "Sécurité",
    done: true,
    priority: "Haute",
  },
  {
    id: "2",
    code: "NX-15",
    title: "Vue Kanban avec drag-and-drop optimiste",
    tag: "Produit",
    done: false,
    priority: "Urgente",
  },
  {
    id: "3",
    code: "NX-16",
    title: "Synchronisation calendrier & fuseaux horaires",
    tag: "Calendrier",
    done: false,
    priority: "Normale",
  },
];

export function HeroDashboardPreview() {
  const [activeTab, setActiveTab] = React.useState<"apercu" | "kanban" | "agenda">("apercu");
  const [completedIds, setCompletedIds] = React.useState<string[]>(["1"]);

  const toggleTask = (id: string) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const progress = Math.round((completedIds.length / PREVIEW_TASKS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative rounded-3xl border border-border-strong bg-secondary-surface/90 p-4 sm:p-5 shadow-2xl"
      style={{ boxShadow: "var(--shadow-glow)" }}
    >
      {/* Window chrome */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3.5 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/80" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            Aperçu interactif (démonstration)
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-elevated p-1">
          {[
            { id: "apercu", label: "Vue globale" },
            { id: "kanban", label: "Kanban" },
            { id: "agenda", label: "Agenda" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "apercu" | "kanban" | "agenda")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#7C3AED] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
        <div className="rounded-xl border border-border-subtle bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Progression</p>
          <p className="mt-1 text-lg font-bold text-foreground tabular-nums">{progress}%</p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-elevated overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Tâches actives</p>
          <p className="mt-1 text-lg font-bold text-foreground tabular-nums">
            {PREVIEW_TASKS.length - completedIds.length}
          </p>
          <p className="mt-0.5 text-[11px] text-[#22D3EE] flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> En direct
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Échéances</p>
          <p className="mt-1 text-lg font-bold text-foreground tabular-nums">3 j</p>
          <p className="mt-0.5 text-[11px] text-[#22C55E]">Sous contrôle</p>
        </div>
      </div>

      {activeTab === "apercu" ? (
        <div className="space-y-2.5">
          {PREVIEW_TASKS.map((task) => {
            const isDone = completedIds.includes(task.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => toggleTask(task.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-subtle bg-card px-3.5 py-2.5 text-left transition hover:border-[#7C3AED]/50 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 transition ${
                      isDone ? "text-[#22C55E]" : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isDone ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      <span className="mr-2 font-mono text-xs text-[#22D3EE]">{task.code}</span>
                      {task.title}
                    </p>
                  </div>
                </div>
                <Badge variant={isDone ? "success" : "violet"}>{task.tag}</Badge>
              </button>
            );
          })}
          <p className="pt-1 text-[11px] text-muted-foreground text-center">
            Cliquez sur une tâche ci-dessus pour simuler sa validation en direct.
          </p>
        </div>
      ) : null}

      {activeTab === "kanban" ? (
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { title: "À faire", items: ["NX-16 Calendrier"] },
            { title: "En cours", items: ["NX-15 Kanban"] },
            { title: "Terminée", items: ["NX-14 RBAC"] },
          ].map((col) => (
            <div
              key={col.title}
              className="rounded-xl border border-border-subtle bg-card/80 p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>{col.title}</span>
                <FolderKanban className="h-3.5 w-3.5 text-[#7C3AED]" />
              </div>
              {col.items.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-border-subtle bg-secondary-surface p-2 text-xs text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "agenda" ? (
        <div className="space-y-2">
          {[
            { time: "09:30", title: "Revue sprint produit (exemple)", color: "#7C3AED" },
            { time: "14:00", title: "Livraison jalon NX-15 (exemple)", color: "#22D3EE" },
          ].map((ev) => (
            <div
              key={ev.title}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-card p-3"
            >
              <span
                className="h-8 w-1 rounded-full shrink-0"
                style={{ backgroundColor: ev.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {ev.time} · Europe/Paris
                </p>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
