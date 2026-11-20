"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  History,
  Paperclip,
  Plus,
  Settings2,
  Star,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import { formatDateFr, formatRelativeTimeFr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TaskDetailModal } from "@/components/shared/task-detail-modal";

export interface ProjectTaskItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
  subtasks: Array<{ id: string; isCompleted: boolean }>;
  _count: { comments: number; attachments: number };
}

export interface ProjectDetailData {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  deadline: string | null;
  isFavorite: boolean;
  myRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string };
  }>;
  workspaceMembers: Array<{ userId: string; name: string; email: string }>;
  tasks: ProjectTaskItem[];
  attachments: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
    uploader: { name: string };
  }>;
  activities: Array<{
    id: string;
    action: string;
    createdAt: string;
    actor: { name: string } | null;
  }>;
}

const COLUMNS: Array<{ status: ProjectTaskItem["status"]; label: string; dot: string }> = [
  { status: "TODO", label: "À faire", dot: "bg-slate-400" },
  { status: "IN_PROGRESS", label: "En cours", dot: "bg-[#3B82F6]" },
  { status: "ON_HOLD", label: "En attente", dot: "bg-[#F59E0B]" },
  { status: "DONE", label: "Terminée", dot: "bg-[#22C55E]" },
];

export function ProjectDetailClient({ initialProject }: { initialProject: ProjectDetailData }) {
  const router = useRouter();
  const [project, setProject] = React.useState(initialProject);
  const [tab, setTab] = React.useState<"kanban" | "liste" | "documents" | "activites">("kanban");
  const [dragTaskId, setDragTaskId] = React.useState<string | null>(null);

  const [newTaskOpen, setNewTaskOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<ProjectTaskItem["status"]>("TODO");
  const [newPriority, setNewPriority] = React.useState<ProjectTaskItem["priority"]>("NORMAL");
  const [newDue, setNewDue] = React.useState("");
  const [newAssignee, setNewAssignee] = React.useState("");
  const [creatingTask, setCreatingTask] = React.useState(false);

  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const [editProjectOpen, setEditProjectOpen] = React.useState(false);
  const [editName, setEditName] = React.useState(project.name);
  const [editDesc, setEditDesc] = React.useState(project.description ?? "");
  const [editStatus, setEditStatus] = React.useState(project.status);

  const [memberModalOpen, setMemberModalOpen] = React.useState(false);
  const [memberUserId, setMemberUserId] = React.useState("");
  const [memberRole, setMemberRole] = React.useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");

  const reloadProject = async () => {
    const res = await fetch(`/api/projects/${project.id}`);
    if (res.ok) {
      const json = await res.json();
      setProject((prev) => ({
        ...prev,
        ...json.project,
        workspaceMembers: prev.workspaceMembers,
      }));
    }
  };

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Optimistic status update with automatic rollback on failure
  const moveTaskStatus = async (taskId: string, nextStatus: ProjectTaskItem["status"]) => {
    const previousTasks = project.tasks;
    const current = previousTasks.find((t) => t.id === taskId);
    if (!current || current.status === nextStatus) return;

    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    }));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Statut mis à jour (${current.code})`);
      await reloadProject();
    } catch {
      setProject((prev) => ({ ...prev, tasks: previousTasks }));
      toast.error("Erreur serveur : statut restauré à l'état précédent.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          status: newStatus,
          priority: newPriority,
          assigneeId: newAssignee || null,
          dueDate: newDue ? new Date(`${newDue}T18:00:00Z`).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Tâche créée.");
      setNewTaskOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewDue("");
      await reloadProject();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tâche supprimée.");
      await reloadProject();
    } else {
      toast.error("Suppression impossible.");
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDesc.trim() || null,
        status: editStatus,
      }),
    });
    if (res.ok) {
      toast.success("Projet mis à jour.");
      setEditProjectOpen(false);
      await reloadProject();
    } else {
      toast.error("Erreur lors de la modification.");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUserId) return;
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: memberUserId, role: memberRole }),
    });
    if (res.ok) {
      toast.success("Permissions du membre mises à jour.");
      setMemberModalOpen(false);
      await reloadProject();
    } else {
      const json = await res.json();
      toast.error(json.error || "Action refusée.");
    }
  };

  const handleProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", project.id);
    const res = await fetch("/api/attachments", { method: "POST", body: formData });
    if (res.ok) {
      toast.success("Document ajouté au projet.");
      await reloadProject();
    } else {
      const json = await res.json();
      toast.error(json.error || "Téléversement refusé.");
    }
    e.target.value = "";
  };

  const toggleFavorite = async () => {
    const next = !project.isFavorite;
    setProject((prev) => ({ ...prev, isFavorite: next }));
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
  };

  const canWrite = project.myRole !== "VIEWER";
  const canAdmin = project.myRole === "OWNER" || project.myRole === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/projets"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux projets
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant={project.status === "ACTIVE" ? "cyan" : "default"}>
              {project.status}
            </Badge>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-label="Basculer favori"
              className="p-1 cursor-pointer"
            >
              <Star
                className={`h-4 w-4 ${
                  project.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                }`}
              />
            </button>
          </div>
          {project.description ? (
            <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAdmin ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setMemberModalOpen(true)}>
                <UserPlus className="h-4 w-4" /> Membres ({project.members.length})
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditProjectOpen(true)}>
                <Settings2 className="h-4 w-4" /> Modifier
              </Button>
            </>
          ) : null}
          {canWrite ? (
            <Button size="md" onClick={() => setNewTaskOpen(true)}>
              <Plus className="h-4 w-4" /> Nouvelle tâche
            </Button>
          ) : null}
        </div>
      </div>

      {/* Progress Strip */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Avancement du projet ({doneTasks} sur {totalTasks} tâches terminées)
            </span>
            <span className="font-mono font-semibold text-foreground">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: project.color }}
            />
          </div>
        </div>
        {project.deadline ? (
          <div className="text-xs text-muted-foreground shrink-0">
            Échéance : <strong className="text-foreground">{formatDateFr(project.deadline)}</strong>
          </div>
        ) : null}
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-2">
        {[
          { id: "kanban", label: "Kanban" },
          { id: "liste", label: "Liste" },
          { id: "documents", label: `Documents (${project.attachments.length})` },
          { id: "activites", label: "Historique" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition cursor-pointer ${
              tab === item.id
                ? "bg-[#7C3AED] text-white"
                : "text-muted-foreground hover:bg-elevated hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col, colIdx) => {
            const items = project.tasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragTaskId && canWrite) {
                    moveTaskStatus(dragTaskId, col.status);
                    setDragTaskId(null);
                  }
                }}
                data-kanban-column={col.status}
                className="rounded-2xl border border-border-subtle bg-secondary-surface/60 p-3.5 min-h-[340px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <Badge>{items.length}</Badge>
                </div>

                <div className="space-y-2.5 flex-1">
                  {items.map((task) => {
                    const doneSub = task.subtasks.filter((s) => s.isCompleted).length;
                    return (
                      <div
                        key={task.id}
                        draggable={canWrite}
                        onDragStart={() => setDragTaskId(task.id)}
                        data-task-id={task.id}
                        className="rounded-xl border border-border-subtle bg-card p-3.5 space-y-2.5 hover:border-[#7C3AED]/50 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                            className="text-left font-medium text-sm text-foreground hover:text-[#22D3EE] cursor-pointer"
                          >
                            <span className="mr-1.5 font-mono text-xs text-[#22D3EE]">
                              {task.code}
                            </span>
                            {task.title}
                          </button>
                          {canWrite ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              aria-label={`Supprimer ${task.title}`}
                              className="text-muted-foreground hover:text-danger cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={
                              task.priority === "URGENT"
                                ? "danger"
                                : task.priority === "HIGH"
                                  ? "warning"
                                  : "blue"
                            }
                          >
                            {task.priority}
                          </Badge>
                          {task.subtasks.length > 0 ? (
                            <Badge>
                              {doneSub}/{task.subtasks.length} sous-tâches
                            </Badge>
                          ) : null}
                          {task.dueDate ? (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateFr(task.dueDate)}
                            </span>
                          ) : null}
                        </div>

                        {canWrite ? (
                          <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                            <span className="text-[11px] text-muted-foreground truncate">
                              {task.assignee?.name ?? "Non assignée"}
                            </span>
                            <div className="flex items-center gap-1">
                              {colIdx > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    moveTaskStatus(task.id, COLUMNS[colIdx - 1].status)
                                  }
                                  aria-label={`Déplacer vers ${COLUMNS[colIdx - 1].label}`}
                                  className="rounded p-1 text-muted-foreground hover:bg-elevated hover:text-foreground cursor-pointer"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                              {colIdx < COLUMNS.length - 1 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    moveTaskStatus(task.id, COLUMNS[colIdx + 1].status)
                                  }
                                  aria-label={`Déplacer vers ${COLUMNS[colIdx + 1].label}`}
                                  className="rounded p-1 text-muted-foreground hover:bg-elevated hover:text-foreground cursor-pointer"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "liste" ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border-subtle text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Tâche</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {project.tasks.map((t) => (
                <tr key={t.id} className="hover:bg-elevated/40">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(t.id)}
                      className="font-medium text-left hover:text-[#22D3EE] cursor-pointer"
                    >
                      <span className="mr-2 font-mono text-xs text-[#22D3EE]">{t.code}</span>
                      {t.title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={t.status}
                      disabled={!canWrite}
                      onChange={(e) =>
                        moveTaskStatus(t.id, e.target.value as ProjectTaskItem["status"])
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
                    <Badge>{t.priority}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {t.assignee?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDateFr(t.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === "documents" ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-[#22D3EE]" /> Documents privés du projet
            </h3>
            {canWrite ? (
              <label className="inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white cursor-pointer hover:brightness-110">
                <Upload className="h-3.5 w-3.5" /> Téléverser un document
                <input type="file" className="sr-only" onChange={handleProjectUpload} />
              </label>
            ) : null}
          </div>
          {project.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun document joint à ce projet. Tous les fichiers sont stockés en accès privé
              autorisé.
            </p>
          ) : (
            <div className="space-y-2">
              {project.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-xl border border-border-subtle bg-secondary-surface p-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-[#22D3EE] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{att.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        Ajouté par {att.uploader.name} ·{" "}
                        {Math.max(1, Math.round(att.sizeBytes / 1024))} Ko
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/api/attachments/${att.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#22D3EE] hover:underline"
                  >
                    <Download className="h-4 w-4" /> Télécharger
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === "activites" ? (
        <Card className="p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-[#7C3AED]" /> Historique du projet
          </h3>
          {project.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>
          ) : (
            <div className="space-y-2.5">
              {project.activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm border-b border-border-subtle last:border-0 pb-2"
                >
                  <span>
                    <strong>{a.actor?.name ?? "Système"}</strong> · {a.action}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTimeFr(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Create Task Modal */}
      <Modal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        title="Nouvelle tâche"
        description={`Ajouter une tâche dans ${project.name}`}
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="ct-title" className="text-xs font-medium text-muted-foreground">
              Titre
            </label>
            <Input
              id="ct-title"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex. Implémenter les tests API"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ct-desc" className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Textarea id="ct-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="ct-status" className="text-xs text-muted-foreground">
                Statut
              </label>
              <Select
                id="ct-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ProjectTaskItem["status"])}
              >
                <option value="TODO">À faire</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="ON_HOLD">En attente</option>
                <option value="DONE">Terminée</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="ct-prio" className="text-xs text-muted-foreground">
                Priorité
              </label>
              <Select
                id="ct-prio"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as ProjectTaskItem["priority"])}
              >
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="ct-assignee" className="text-xs text-muted-foreground">
                Responsable
              </label>
              <Select
                id="ct-assignee"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
              >
                <option value="">Non assignée</option>
                {project.workspaceMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="ct-due" className="text-xs text-muted-foreground">
                Date limite
              </label>
              <Input
                id="ct-due"
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setNewTaskOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={creatingTask}>
              Créer la tâche
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        title="Paramètres du projet"
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="ep-name" className="text-xs text-muted-foreground">
              Nom
            </label>
            <Input
              id="ep-name"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ep-desc" className="text-xs text-muted-foreground">
              Description
            </label>
            <Textarea id="ep-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="ep-status" className="text-xs text-muted-foreground">
              Statut
            </label>
            <Select
              id="ep-status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
            >
              <option value="ACTIVE">Actif</option>
              <option value="COMPLETED">Terminé</option>
              <option value="ARCHIVED">Archivé</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditProjectOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Members Permissions Modal */}
      <Modal
        open={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Membres et permissions du projet"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            {project.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-card px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <Badge variant="violet">{m.role}</Badge>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddMember} className="space-y-3 border-t border-border-subtle pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Ajouter ou ajuster un membre de l&apos;espace
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                aria-label="Membre"
              >
                <option value="">Sélectionner un membre…</option>
                {project.workspaceMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </Select>
              <Select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as typeof memberRole)}
                aria-label="Rôle"
              >
                <option value="ADMIN">Administrateur</option>
                <option value="MEMBER">Membre</option>
                <option value="VIEWER">Lecteur</option>
              </Select>
            </div>
            <Button type="submit" size="sm" className="w-full">
              Enregistrer les droits
            </Button>
          </form>
        </div>
      </Modal>

      <TaskDetailModal
        taskId={selectedTaskId}
        members={project.workspaceMembers}
        open={Boolean(selectedTaskId)}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => {
          reloadProject();
          router.refresh();
        }}
      />
    </div>
  );
}
