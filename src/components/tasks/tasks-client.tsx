"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckSquare, FolderKanban, LayoutList, Plus, Search, Trash2 } from "lucide-react";
import { formatDateFr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TaskDetailModal } from "@/components/shared/task-detail-modal";

export interface GlobalTaskItem {
  id: string;
  code: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
}

export function TasksClient({
  currentUserId,
  initialTasks,
  projects,
  members,
}: {
  currentUserId: string;
  initialTasks: GlobalTaskItem[];
  projects: Array<{ id: string; name: string; color: string }>;
  members: Array<{ userId: string; name: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = React.useState(initialTasks);
  const [view, setView] = React.useState<"list" | "kanban">("list");
  const [search, setSearch] = React.useState("");
  const [projectFilter, setProjectFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState("ALL");
  const [onlyMine, setOnlyMine] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"createdAt" | "dueDate" | "priority">("createdAt");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(searchParams.get("new") === "1");
  const [newProjectId, setNewProjectId] = React.useState(projects[0]?.id ?? "");
  const [newTitle, setNewTitle] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newPriority, setNewPriority] = React.useState<GlobalTaskItem["priority"]>("NORMAL");
  const [newDue, setNewDue] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const reloadTasks = async () => {
    const res = await fetch("/api/tasks?limit=100");
    if (res.ok) {
      const json = await res.json();
      setTasks(
        json.tasks.map((t: Record<string, unknown>) => ({
          id: t.id,
          code: t.code,
          projectId: t.projectId,
          projectName: (t.project as { name: string }).name,
          projectColor: (t.project as { color: string }).color,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          assigneeId: t.assigneeId,
          assigneeName: (t.assignee as { name: string } | null)?.name ?? null,
          createdAt: t.createdAt,
        }))
      );
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectId || !newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: newProjectId,
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          priority: newPriority,
          assigneeId: currentUserId,
          dueDate: newDue ? new Date(`${newDue}T18:00:00Z`).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      toast.success("Tâche créée.");
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewDue("");
      await reloadTasks();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, nextStatus: GlobalTaskItem["status"]) => {
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      setTasks(prev);
      toast.error("Erreur serveur : modification annulée.");
    } else {
      toast.success("Statut mis à jour.");
    }
  };

  const runBulkAction = async (
    action: "STATUS" | "PRIORITY" | "DELETE",
    extra?: { status?: GlobalTaskItem["status"]; priority?: GlobalTaskItem["priority"] }
  ) => {
    if (selectedIds.length === 0) return;
    const res = await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds: selectedIds, action, ...extra }),
    });
    if (res.ok) {
      toast.success("Action groupée appliquée.");
      setSelectedIds([]);
      await reloadTasks();
      router.refresh();
    } else {
      toast.error("Action groupée refusée.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const priorityRank: Record<GlobalTaskItem["priority"], number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  const filtered = tasks
    .filter((t) => {
      if (projectFilter !== "ALL" && t.projectId !== projectFilter) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (onlyMine && t.assigneeId !== currentUserId) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.code.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") return priorityRank[b.priority] - priorityRank[a.priority];
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mes tâches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filtrez, triez, déplacez en Kanban ou appliquez des actions groupées.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={projects.length === 0}>
          <Plus className="h-4 w-4" /> Nouvelle tâche
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher NX-… ou titre"
              className="pl-9"
              aria-label="Rechercher une tâche"
            />
          </div>

          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-40"
            aria-label="Projet"
          >
            <option value="ALL">Tous projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36"
            aria-label="Statut"
          >
            <option value="ALL">Tous statuts</option>
            <option value="TODO">À faire</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="ON_HOLD">En attente</option>
            <option value="DONE">Terminée</option>
          </Select>

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-36"
            aria-label="Priorité"
          >
            <option value="ALL">Toutes priorités</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Haute</option>
            <option value="NORMAL">Normale</option>
            <option value="LOW">Basse</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-36"
            aria-label="Trier par"
          >
            <option value="createdAt">Plus récentes</option>
            <option value="dueDate">Échéance</option>
            <option value="priority">Priorité</option>
          </Select>

          <Button
            type="button"
            variant={onlyMine ? "primary" : "secondary"}
            size="md"
            onClick={() => setOnlyMine((v) => !v)}
          >
            Assignées à moi
          </Button>
        </div>

        <div className="inline-flex rounded-xl border border-border-subtle bg-secondary-surface p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              view === "list" ? "bg-[#7C3AED] text-white" : "text-muted-foreground"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" /> Liste
          </button>
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              view === "kanban" ? "bg-[#7C3AED] text-white" : "text-muted-foreground"
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#7C3AED]/40 bg-[#7C3AED]/10 px-4 py-3 text-sm">
          <span className="font-medium">{selectedIds.length} tâche(s) sélectionnée(s)</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runBulkAction("STATUS", { status: "IN_PROGRESS" })}
            >
              Passer En cours
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runBulkAction("STATUS", { status: "DONE" })}
            >
              Marquer Terminée
            </Button>
            <Button size="sm" variant="danger" onClick={() => runBulkAction("DELETE")}>
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </Button>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Aucune tâche ne correspond"
          description={
            projects.length === 0
              ? "Créez d'abord un projet avant d'ajouter des tâches."
              : "Ajoutez une nouvelle tâche ou élargissez vos filtres."
          }
          action={
            projects.length > 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Créer une tâche
              </Button>
            ) : undefined
          }
        />
      ) : view === "list" ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border-subtle text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filtered.map((t) => t.id) : [])
                    }
                    className="accent-[#7C3AED]"
                  />
                </th>
                <th className="px-4 py-3">Tâche</th>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-elevated/40">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      aria-label={`Sélectionner ${t.title}`}
                      className="accent-[#7C3AED]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setActiveTaskId(t.id)}
                      className="font-medium text-left hover:text-[#22D3EE] cursor-pointer"
                    >
                      <span className="mr-2 font-mono text-xs text-[#22D3EE]">{t.code}</span>
                      {t.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.projectColor }}
                      />
                      {t.projectName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={t.status}
                      onChange={(e) =>
                        updateStatus(t.id, e.target.value as GlobalTaskItem["status"])
                      }
                      className="h-8 w-36 text-xs"
                    >
                      <option value="TODO">À faire</option>
                      <option value="IN_PROGRESS">En cours</option>
                      <option value="ON_HOLD">En attente</option>
                      <option value="DONE">Terminée</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        t.priority === "URGENT"
                          ? "danger"
                          : t.priority === "HIGH"
                            ? "warning"
                            : "blue"
                      }
                    >
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDateFr(t.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(
            [
              { status: "TODO", label: "À faire" },
              { status: "IN_PROGRESS", label: "En cours" },
              { status: "ON_HOLD", label: "En attente" },
              { status: "DONE", label: "Terminée" },
            ] as const
          ).map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragTaskId) {
                    updateStatus(dragTaskId, col.status);
                    setDragTaskId(null);
                  }
                }}
                className="rounded-2xl border border-border-subtle bg-secondary-surface/60 p-3.5 min-h-[320px] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge>{colTasks.length}</Badge>
                </div>
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragTaskId(t.id)}
                    onClick={() => setActiveTaskId(t.id)}
                    className="rounded-xl border border-border-subtle bg-card p-3 cursor-pointer hover:border-[#7C3AED]/50 space-y-1.5"
                  >
                    <p className="text-sm font-medium">
                      <span className="mr-1.5 font-mono text-xs text-[#22D3EE]">{t.code}</span>
                      {t.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{t.projectName}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* New Task Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une tâche">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="gt-proj" className="text-xs text-muted-foreground">
              Projet
            </label>
            <Select
              id="gt-proj"
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="gt-title" className="text-xs text-muted-foreground">
              Titre
            </label>
            <Input
              id="gt-title"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex. Rédiger la documentation API"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="gt-desc" className="text-xs text-muted-foreground">
              Description
            </label>
            <Textarea id="gt-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="gt-prio" className="text-xs text-muted-foreground">
                Priorité
              </label>
              <Select
                id="gt-prio"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as GlobalTaskItem["priority"])}
              >
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="gt-due" className="text-xs text-muted-foreground">
                Date limite
              </label>
              <Input
                id="gt-due"
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={creating}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      <TaskDetailModal
        taskId={activeTaskId}
        members={members}
        open={Boolean(activeTaskId)}
        onClose={() => setActiveTaskId(null)}
        onUpdated={() => {
          reloadTasks();
          router.refresh();
        }}
      />
    </div>
  );
}
