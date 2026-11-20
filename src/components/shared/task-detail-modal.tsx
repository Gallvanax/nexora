"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckSquare,
  Download,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Timer,
  Trash2,
  Upload,
} from "lucide-react";
import { formatDateFr, formatRelativeTimeFr } from "@/lib/utils";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FocusModeModal } from "@/components/shared/focus-mode-modal";

export interface DetailedTask {
  id: string;
  code: string;
  projectId: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate: string | null;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  assigneeId: string | null;
  loggedMinutes: number;
  subtasks: Array<{ id: string; title: string; isCompleted: boolean }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string };
  }>;
  attachments: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    mimeType: string;
    uploader: { name: string };
  }>;
}

export function TaskDetailModal({
  taskId,
  members,
  open,
  onClose,
  onUpdated,
}: {
  taskId: string | null;
  members: Array<{ userId: string; name: string }>;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [task, setTask] = React.useState<DetailedTask | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<DetailedTask["status"]>("TODO");
  const [priority, setPriority] = React.useState<DetailedTask["priority"]>("NORMAL");
  const [recurrence, setRecurrence] = React.useState<DetailedTask["recurrence"]>("NONE");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  const [newSubtask, setNewSubtask] = React.useState("");
  const [newComment, setNewComment] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [focusOpen, setFocusOpen] = React.useState(false);

  const loadTask = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const t: DetailedTask = json.task;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description ?? "");
      setStatus(t.status);
      setPriority(t.priority);
      setRecurrence(t.recurrence);
      setAssigneeId(t.assigneeId ?? "");
      setDueDate(t.dueDate ? t.dueDate.slice(0, 10) : "");
    } catch {
      toast.error("Impossible de charger la tâche.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    fetch(`/api/tasks/${taskId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const t: DetailedTask = json.task;
        setTask(t);
        setTitle(t.title);
        setDescription(t.description ?? "");
        setStatus(t.status);
        setPriority(t.priority);
        setRecurrence(t.recurrence);
        setAssigneeId(t.assigneeId ?? "");
        setDueDate(t.dueDate ? t.dueDate.slice(0, 10) : "");
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossible de charger la tâche.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          status,
          priority,
          recurrence,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(`${dueDate}T18:00:00Z`).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      toast.success("Tâche enregistrée.");
      onUpdated();
      await loadTask(task.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const addSubtask = async () => {
    if (!task || !newSubtask.trim()) return;
    const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubtask.trim() }),
    });
    if (res.ok) {
      setNewSubtask("");
      await loadTask(task.id);
      onUpdated();
    } else {
      toast.error("Impossible d'ajouter la sous-tâche.");
    }
  };

  const toggleSubtask = async (subId: string, current: boolean) => {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/subtasks/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !current }),
    });
    if (res.ok) {
      await loadTask(task.id);
      onUpdated();
    }
  };

  const deleteSubtask = async (subId: string) => {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/subtasks/${subId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadTask(task.id);
      onUpdated();
    }
  };

  const addComment = async () => {
    if (!task || !newComment.trim()) return;
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim() }),
    });
    if (res.ok) {
      setNewComment("");
      await loadTask(task.id);
      toast.success("Commentaire ajouté.");
    } else {
      toast.error("Échec de l'envoi du commentaire.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", task.id);
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Pièce jointe ajoutée.");
      await loadTask(task.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du téléversement.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={task ? `${task.code} — Détail de la tâche` : "Chargement…"}
        className="max-w-2xl"
      >
        {loading || !task ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Chargement des détails…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="cyan">{task.code}</Badge>
                <Badge>{task.loggedMinutes} min focus</Badge>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFocusOpen(true)}
              >
                <Timer className="h-3.5 w-3.5 text-[#22D3EE]" /> Mode Concentration
              </Button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="td-title" className="text-xs font-medium text-muted-foreground">
                  Titre
                </label>
                <Input id="td-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="td-desc" className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <Textarea
                  id="td-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ajoutez des détails ou critères d'acceptation…"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="td-status" className="text-xs text-muted-foreground">
                    Statut
                  </label>
                  <Select
                    id="td-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DetailedTask["status"])}
                  >
                    <option value="TODO">À faire</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="ON_HOLD">En attente</option>
                    <option value="DONE">Terminée</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="td-prio" className="text-xs text-muted-foreground">
                    Priorité
                  </label>
                  <Select
                    id="td-prio"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as DetailedTask["priority"])}
                  >
                    <option value="LOW">Basse</option>
                    <option value="NORMAL">Normale</option>
                    <option value="HIGH">Haute</option>
                    <option value="URGENT">Urgente</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="td-assignee" className="text-xs text-muted-foreground">
                    Responsable
                  </label>
                  <Select
                    id="td-assignee"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Non assignée</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="td-due" className="text-xs text-muted-foreground">
                    Date limite
                  </label>
                  <Input
                    id="td-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="td-rec" className="text-xs text-muted-foreground">
                    Récurrence automatique (lorsqu&apos;elle est terminée)
                  </label>
                  <Select
                    id="td-rec"
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as DetailedTask["recurrence"])}
                  >
                    <option value="NONE">Aucune</option>
                    <option value="DAILY">Quotidienne</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                    <option value="MONTHLY">Mensuelle</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={saving}>
                  Enregistrer les modifications
                </Button>
              </div>
            </form>

            {/* Subtasks */}
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#7C3AED]" />
                Sous-tâches ({task.subtasks.filter((s) => s.isCompleted).length}/
                {task.subtasks.length})
              </h4>
              <div className="space-y-1.5">
                {task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={sub.isCompleted}
                        onChange={() => toggleSubtask(sub.id, sub.isCompleted)}
                        className="accent-[#7C3AED]"
                      />
                      <span className={sub.isCompleted ? "line-through text-muted-foreground" : ""}>
                        {sub.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => deleteSubtask(sub.id)}
                      aria-label="Supprimer sous-tâche"
                      className="text-muted-foreground hover:text-danger cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Nouvelle sous-tâche…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                />
                <Button type="button" variant="secondary" size="sm" onClick={addSubtask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Attachments */}
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-[#22D3EE]" />
                  Pièces jointes ({task.attachments.length})
                </h4>
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-elevated px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-card">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Envoi…" : "Ajouter un fichier"}
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              {task.attachments.length > 0 ? (
                <div className="space-y-1.5">
                  {task.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-lg border border-border-subtle bg-card px-3 py-2 text-xs"
                    >
                      <span className="truncate font-medium">
                        {att.originalName} ({Math.max(1, Math.round(att.sizeBytes / 1024))} Ko)
                      </span>
                      <a
                        href={`/api/attachments/${att.id}`}
                        className="inline-flex items-center gap-1 text-[#22D3EE] hover:underline shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" /> Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Formats autorisés : PNG, JPG, WEBP, PDF, TXT, CSV, JSON (max 10 Mo).
                </p>
              )}
            </div>

            {/* Comments */}
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#3B82F6]" />
                Commentaires ({task.comments.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {task.comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-border-subtle bg-card p-3 text-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-semibold text-foreground">{c.author.name}</span>
                      <span>{formatRelativeTimeFr(c.createdAt)}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Écrire un commentaire…"
                />
                <Button type="button" size="sm" onClick={addComment}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              {task.dueDate ? (
                <p className="text-[11px] text-muted-foreground">
                  Échéance actuelle : {formatDateFr(task.dueDate)}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      <FocusModeModal
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        task={
          task
            ? {
                id: task.id,
                code: task.code,
                title: task.title,
                loggedMinutes: task.loggedMinutes,
              }
            : null
        }
        onSaved={() => {
          if (task) loadTask(task.id);
          onUpdated();
        }}
      />
    </>
  );
}
