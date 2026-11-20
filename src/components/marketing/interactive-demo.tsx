"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DemoStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface DemoTask {
  id: string;
  title: string;
  priority: "Haute" | "Normale" | "Urgente";
  status: DemoStatus;
}

const INITIAL_DEMO_TASKS: DemoTask[] = [
  { id: "d1", title: "Définir les objectifs du trimestre", priority: "Haute", status: "DONE" },
  {
    id: "d2",
    title: "Préparer la maquette responsive",
    priority: "Urgente",
    status: "IN_PROGRESS",
  },
  {
    id: "d3",
    title: "Planifier les jalons dans le calendrier",
    priority: "Normale",
    status: "TODO",
  },
];

const COLUMNS: Array<{ status: DemoStatus; label: string; dot: string }> = [
  { status: "TODO", label: "À faire", dot: "bg-[#94A3B8]" },
  { status: "IN_PROGRESS", label: "En cours", dot: "bg-[#3B82F6]" },
  { status: "DONE", label: "Terminée", dot: "bg-[#22C55E]" },
];

export function InteractiveDemo() {
  const [tasks, setTasks] = React.useState<DemoTask[]>(INITIAL_DEMO_TASKS);
  const [draft, setDraft] = React.useState("");

  const addDemoTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks((prev) => [
      ...prev,
      { id: `demo-${Date.now()}`, title, priority: "Normale", status: "TODO" },
    ]);
    setDraft("");
  };

  const cycleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: DemoStatus =
          t.status === "TODO" ? "IN_PROGRESS" : t.status === "IN_PROGRESS" ? "DONE" : "TODO";
        return { ...t, status: next };
      })
    );
  };

  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="rounded-3xl border border-border-strong bg-secondary-surface p-5 sm:p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED]/15 px-3 py-1 text-xs font-medium text-[#A78BFA] mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Démonstration interactive (locale)
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Testez la fluidité du flux Kanban NEXORA
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez une tâche ou cliquez pour la faire avancer d&apos;une colonne à l&apos;autre.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Avancement démo</p>
            <p className="text-lg font-bold text-foreground tabular-nums">{pct}%</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
          </div>
        </div>
      </div>

      <form onSubmit={addDemoTask} className="mt-5 flex flex-col sm:flex-row gap-2.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter une tâche exemple (ex. Valider le cahier des charges)…"
          aria-label="Nouvelle tâche de démonstration"
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          <Plus className="h-4 w-4" /> Ajouter à la démo
        </Button>
      </form>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.status);
          return (
            <div
              key={col.status}
              className="rounded-2xl border border-border-subtle bg-card/70 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                </div>
                <Badge>{items.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cycleStatus(item.id)}
                    className="group w-full rounded-xl border border-border-subtle bg-secondary-surface p-3 text-left transition hover:border-[#7C3AED]/60 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-70 group-hover:translate-x-0.5 transition shrink-0" />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge
                        variant={
                          item.priority === "Urgente"
                            ? "danger"
                            : item.priority === "Haute"
                              ? "warning"
                              : "blue"
                        }
                      >
                        {item.priority}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Cliquer pour déplacer
                      </span>
                    </div>
                  </button>
                ))}
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Aucune tâche dans cette colonne
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
