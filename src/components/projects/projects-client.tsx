"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  Calendar,
  FolderKanban,
  LayoutGrid,
  LayoutList,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { PROJECT_TEMPLATES } from "@/services/project-templates";
import { formatDateFr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";

export interface ProjectListItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  deadline: string | null;
  isFavorite: boolean;
  memberCount: number;
  taskStats: {
    total: number;
    done: number;
    inProgress: number;
    progress: number;
  };
}

const COLOR_PRESETS = ["#7C3AED", "#3B82F6", "#22D3EE", "#22C55E", "#F59E0B", "#EC4899"];

export function ProjectsClient({
  initialProjects,
  initialView,
  workspaces,
}: {
  initialProjects: ProjectListItem[];
  initialView: "GRID" | "LIST" | "KANBAN";
  workspaces: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = React.useState<ProjectListItem[]>(initialProjects);
  const [viewMode, setViewMode] = React.useState<"GRID" | "LIST" | "KANBAN">(initialView);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | "ACTIVE" | "ARCHIVED" | "COMPLETED"
  >("ALL");
  const [favoriteOnly, setFavoriteOnly] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(searchParams.get("new") === "1");
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectListItem | null>(null);

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("#7C3AED");
  const [deadline, setDeadline] = React.useState("");
  const [templateKey, setTemplateKey] = React.useState<
    "blank" | "school" | "software" | "business" | "personal"
  >("blank");
  const [workspaceId, setWorkspaceId] = React.useState(workspaces[0]?.id ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  const refreshProjects = async () => {
    const res = await fetch("/api/projects?limit=50");
    if (res.ok) {
      const json = await res.json();
      setProjects(json.projects);
    }
  };

  const changeViewMode = (mode: "GRID" | "LIST" | "KANBAN") => {
    setViewMode(mode);
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { defaultProjectView: mode } }),
    }).catch(() => undefined);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceId || undefined,
          name: name.trim(),
          description: description.trim() || null,
          color,
          deadline: deadline ? new Date(`${deadline}T18:00:00Z`).toISOString() : null,
          templateKey,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de la création.");
      toast.success("Projet créé avec succès !");
      setCreateOpen(false);
      setName("");
      setDescription("");
      setDeadline("");
      await refreshProjects();
      router.push(`/projets/${json.project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = async (p: ProjectListItem) => {
    const next = !p.isFavorite;
    setProjects((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, isFavorite: next } : item))
    );
    const res = await fetch(`/api/projects/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
    if (!res.ok) {
      setProjects((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isFavorite: p.isFavorite } : item))
      );
      toast.error("Action impossible.");
    }
  };

  const toggleArchive = async (p: ProjectListItem) => {
    const nextStatus = p.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
    const res = await fetch(`/api/projects/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      toast.success(nextStatus === "ARCHIVED" ? "Projet archivé." : "Projet restauré.");
      await refreshProjects();
    } else {
      toast.error("Action non autorisée.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Projet supprimé.");
      setDeleteTarget(null);
      await refreshProjects();
    } else {
      const json = await res.json();
      toast.error(json.error || "Suppression impossible.");
    }
  };

  const filtered = projects.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (favoriteOnly && !p.isFavorite) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mes projets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilotez vos projets en vue grille, liste ou Kanban par statut.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Créer un projet
        </Button>
      </div>

      {/* Filters & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet…"
              className="pl-9"
              aria-label="Rechercher un projet"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-40"
            aria-label="Filtrer par statut"
          >
            <option value="ALL">Tous statuts</option>
            <option value="ACTIVE">Actifs</option>
            <option value="COMPLETED">Terminés</option>
            <option value="ARCHIVED">Archivés</option>
          </Select>
          <Button
            type="button"
            variant={favoriteOnly ? "primary" : "secondary"}
            size="md"
            onClick={() => setFavoriteOnly((v) => !v)}
          >
            <Star className="h-4 w-4" /> Favoris
          </Button>
        </div>

        <div className="inline-flex rounded-xl border border-border-subtle bg-secondary-surface p-1 self-start">
          {[
            { id: "GRID", label: "Grille", icon: LayoutGrid },
            { id: "LIST", label: "Liste", icon: LayoutList },
            { id: "KANBAN", label: "Kanban", icon: FolderKanban },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => changeViewMode(v.id as typeof viewMode)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  viewMode === v.id
                    ? "bg-[#7C3AED] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet trouvé"
          description="Créez un nouveau projet ou modifiez vos filtres de recherche."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nouveau projet
            </Button>
          }
        />
      ) : viewMode === "GRID" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="p-5 flex flex-col justify-between hover:border-[#7C3AED]/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projets/${p.id}`} className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <h3 className="font-semibold text-foreground truncate hover:text-[#22D3EE]">
                      {p.name}
                    </h3>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(p)}
                    aria-label={p.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    className="p-1 text-muted-foreground hover:text-amber-400 cursor-pointer"
                  >
                    <Star
                      className={`h-4 w-4 ${p.isFavorite ? "fill-amber-400 text-amber-400" : ""}`}
                    />
                  </button>
                </div>

                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {p.description || "Aucune description renseignée."}
                </p>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {p.taskStats.done}/{p.taskStats.total} tâches
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {p.taskStats.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${p.taskStats.progress}%`,
                        backgroundColor: p.color,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge
                    variant={
                      p.status === "ACTIVE"
                        ? "cyan"
                        : p.status === "COMPLETED"
                          ? "success"
                          : "default"
                    }
                  >
                    {p.status === "ACTIVE"
                      ? "Actif"
                      : p.status === "COMPLETED"
                        ? "Terminé"
                        : "Archivé"}
                  </Badge>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {p.memberCount}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleArchive(p)}
                    title={p.status === "ARCHIVED" ? "Restaurer" : "Archiver"}
                    aria-label={p.status === "ARCHIVED" ? "Restaurer" : "Archiver"}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-elevated hover:text-foreground cursor-pointer"
                  >
                    {p.status === "ARCHIVED" ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    title="Supprimer"
                    aria-label="Supprimer le projet"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/15 hover:text-danger cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : viewMode === "LIST" ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border-subtle text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Progression</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-elevated/40">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/projets/${p.id}`}
                      className="flex items-center gap-2.5 hover:text-[#22D3EE]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.taskStats.progress}%</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.deadline ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDateFr(p.deadline)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleArchive(p)}>
                      {p.status === "ARCHIVED" ? "Restaurer" : "Archiver"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)}>
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(["ACTIVE", "COMPLETED", "ARCHIVED"] as const).map((colStatus) => {
            const colProjects = filtered.filter((p) => p.status === colStatus);
            const label =
              colStatus === "ACTIVE"
                ? "Actifs"
                : colStatus === "COMPLETED"
                  ? "Terminés"
                  : "Archivés";
            return (
              <div
                key={colStatus}
                className="rounded-2xl border border-border-subtle bg-secondary-surface/60 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{label}</span>
                  <Badge>{colProjects.length}</Badge>
                </div>
                <div className="space-y-3">
                  {colProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projets/${p.id}`}
                      className="block rounded-xl border border-border-subtle bg-card p-3.5 hover:border-[#7C3AED]/50"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-medium text-sm truncate">{p.name}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {p.taskStats.done}/{p.taskStats.total} tâches · {p.taskStats.progress}%
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau projet"
        description="Choisissez un modèle prédéfini ou partez d'un projet vierge."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {workspaces.length > 1 ? (
            <div className="space-y-1">
              <label htmlFor="np-ws" className="text-xs font-medium text-muted-foreground">
                Espace de travail
              </label>
              <Select
                id="np-ws"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="np-tpl" className="text-xs font-medium text-muted-foreground">
              Modèle de projet
            </label>
            <Select
              id="np-tpl"
              value={templateKey}
              onChange={(e) => {
                const key = e.target.value as typeof templateKey;
                setTemplateKey(key);
                const found = PROJECT_TEMPLATES.find((t) => t.key === key);
                if (found) setColor(found.color);
              }}
            >
              {PROJECT_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name} — {t.description}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="np-name" className="text-xs font-medium text-muted-foreground">
              Nom du projet
            </label>
            <Input
              id="np-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Refonte Application Mobile"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="np-desc" className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Textarea
              id="np-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectifs et contexte du projet…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Couleur</span>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Couleur ${c}`}
                    className={`h-7 w-7 rounded-full border-2 cursor-pointer ${
                      color === c ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="np-deadline" className="text-xs font-medium text-muted-foreground">
                Date limite
              </label>
              <Input
                id="np-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={submitting}>
              Créer le projet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer ce projet ?"
        description="Cette action supprimera définitivement le projet ainsi que ses tâches associées."
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Confirmez-vous la suppression de <strong>{deleteTarget?.name}</strong> ?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
