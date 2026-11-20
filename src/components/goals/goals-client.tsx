"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { formatDateFr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";

export interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  currentValue: number;
  targetValue: number;
  unit: string;
  dueDate: string | null;
  status: "ON_TRACK" | "AT_RISK" | "COMPLETED";
  project: { id: string; name: string; color: string } | null;
}

export function GoalsClient({
  initialGoals,
  projects,
}: {
  initialGoals: GoalItem[];
  projects: Array<{ id: string; name: string }>;
}) {
  const [goals, setGoals] = React.useState(initialGoals);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetValue, setTargetValue] = React.useState(100);
  const [currentValue, setCurrentValue] = React.useState(0);
  const [unit, setUnit] = React.useState("%");
  const [projectId, setProjectId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reload = async () => {
    const res = await fetch("/api/goals");
    if (res.ok) {
      const json = await res.json();
      setGoals(json.goals);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          targetValue: Number(targetValue),
          currentValue: Number(currentValue),
          unit: unit.trim() || "%",
          projectId: projectId || null,
          dueDate: dueDate ? new Date(`${dueDate}T18:00:00Z`).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Objectif créé.");
      setModalOpen(false);
      setTitle("");
      setDescription("");
      await reload();
    } catch {
      toast.error("Impossible de créer l'objectif.");
    } finally {
      setSaving(false);
    }
  };

  const incrementGoal = async (goal: GoalItem, delta: number) => {
    const nextVal = Math.max(0, Math.min(goal.targetValue, goal.currentValue + delta));
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentValue: nextVal }),
    });
    if (res.ok) {
      toast.success("Progression enregistrée.");
      await reload();
    }
  };

  const deleteGoal = async (id: string) => {
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Objectif supprimé.");
      await reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Objectifs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Définissez des résultats mesurables et suivez votre progression vers vos jalons.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvel objectif
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucun objectif défini"
          description="Créez un premier objectif chiffré lié à un projet ou à votre espace."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Créer un objectif
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
            const step = Math.max(1, Math.round(g.targetValue / 10));
            return (
              <Card key={g.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          g.status === "COMPLETED"
                            ? "success"
                            : g.status === "AT_RISK"
                              ? "danger"
                              : "cyan"
                        }
                      >
                        {g.status === "COMPLETED"
                          ? "Atteint"
                          : g.status === "AT_RISK"
                            ? "À risque"
                            : "En bonne voie"}
                      </Badge>
                      {g.project ? <Badge variant="violet">{g.project.name}</Badge> : null}
                    </div>
                    <h3 className="mt-2 font-semibold text-foreground">{g.title}</h3>
                    {g.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteGoal(g.id)}
                    aria-label={`Supprimer ${g.title}`}
                    className="p-1.5 text-muted-foreground hover:text-danger cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {g.currentValue} / {g.targetValue} {g.unit}
                    </span>
                    <span className="font-mono font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <span className="text-xs text-muted-foreground">
                    {g.dueDate ? `Échéance : ${formatDateFr(g.dueDate)}` : "Sans date limite"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => incrementGoal(g, -step)}>
                      -{step}
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => incrementGoal(g, step)}>
                      <TrendingUp className="h-3.5 w-3.5" /> +{step}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel objectif">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="g-title" className="text-xs text-muted-foreground">
              Titre de l&apos;objectif
            </label>
            <Input
              id="g-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Livrer la version bêta publique"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="g-desc" className="text-xs text-muted-foreground">
              Description
            </label>
            <Textarea
              id="g-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="g-cur" className="text-xs text-muted-foreground">
                Actuel
              </label>
              <Input
                id="g-cur"
                type="number"
                min={0}
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="g-target" className="text-xs text-muted-foreground">
                Cible
              </label>
              <Input
                id="g-target"
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="g-unit" className="text-xs text-muted-foreground">
                Unité
              </label>
              <Input
                id="g-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="g-proj" className="text-xs text-muted-foreground">
                Projet lié
              </label>
              <Select id="g-proj" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Global</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="g-due" className="text-xs text-muted-foreground">
                Date cible
              </label>
              <Input
                id="g-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={saving}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
