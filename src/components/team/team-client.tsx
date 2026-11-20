"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Check, Mail, Plus, Shield, Trash2, UserPlus, X } from "lucide-react";
import { formatDateFr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";

interface WorkspaceInfo {
  id: string;
  name: string;
  description: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}

interface MemberRow {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
  user: { id: string; name: string; email: string; jobTitle: string | null };
}

interface PendingSentInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface ReceivedInvite {
  id: string;
  role: string;
  workspace: { id: string; name: string; description: string | null };
  invitedBy: { name: string; email: string };
}

export function TeamClient({
  currentUserId,
  initialWorkspaces,
  initialReceivedInvites,
}: {
  currentUserId: string;
  initialWorkspaces: WorkspaceInfo[];
  initialReceivedInvites: ReceivedInvite[];
}) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = React.useState(initialWorkspaces);
  const [activeWsId, setActiveWsId] = React.useState(initialWorkspaces[0]?.id ?? "");
  const [members, setMembers] = React.useState<MemberRow[]>([]);
  const [sentInvites, setSentInvites] = React.useState<PendingSentInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = React.useState(initialReceivedInvites);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [inviting, setInviting] = React.useState(false);

  const [wsModalOpen, setWsModalOpen] = React.useState(false);
  const [wsName, setWsName] = React.useState("");
  const [wsDesc, setWsDesc] = React.useState("");

  const loadWorkspaceTeam = React.useCallback(async (wsId: string) => {
    if (!wsId) return;
    const res = await fetch(`/api/workspaces/${wsId}/members`);
    if (res.ok) {
      const json = await res.json();
      setMembers(json.members);
      setSentInvites(json.invitations);
    }
  }, []);

  React.useEffect(() => {
    if (!activeWsId) return;
    let cancelled = false;
    fetch(`/api/workspaces/${activeWsId}/members`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) {
          setMembers(json.members);
          setSentInvites(json.invitations);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeWsId]);

  const activeWs = workspaces.find((w) => w.id === activeWsId);
  const canAdmin = activeWs?.role === "OWNER" || activeWs?.role === "ADMIN";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWsId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWsId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Invitation créée pour ${inviteEmail}.`);
      setInviteEmail("");
      await loadWorkspaceTeam(activeWsId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invitation impossible.");
    } finally {
      setInviting(false);
    }
  };

  const respondInvitation = async (invitationId: string, decision: "accept" | "decline") => {
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, decision }),
    });
    if (res.ok) {
      toast.success(decision === "accept" ? "Invitation acceptée !" : "Invitation refusée.");
      setReceivedInvites((prev) => prev.filter((i) => i.id !== invitationId));
      const wsRes = await fetch("/api/workspaces");
      if (wsRes.ok) {
        const wsJson = await wsRes.json();
        setWorkspaces(wsJson.workspaces);
      }
      router.refresh();
    } else {
      toast.error("Impossible de répondre à l'invitation.");
    }
  };

  const changeMemberRole = async (memberId: string, role: "ADMIN" | "MEMBER" | "VIEWER") => {
    const res = await fetch(`/api/workspaces/${activeWsId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      toast.success("Rôle mis à jour.");
      await loadWorkspaceTeam(activeWsId);
    } else {
      toast.error("Action non autorisée.");
    }
  };

  const removeMember = async (memberId: string) => {
    const res = await fetch(`/api/workspaces/${activeWsId}/members/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Membre retiré.");
      await loadWorkspaceTeam(activeWsId);
    } else {
      const json = await res.json();
      toast.error(json.error || "Impossible de retirer ce membre.");
    }
  };

  const revokeInvite = async (invitationId: string) => {
    const res = await fetch(`/api/workspaces/${activeWsId}/invitations/${invitationId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Invitation annulée.");
      await loadWorkspaceTeam(activeWsId);
    }
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wsName.trim(), description: wsDesc.trim() || null }),
    });
    if (res.ok) {
      const json = await res.json();
      toast.success("Espace de travail créé.");
      setWsModalOpen(false);
      setWsName("");
      setWsDesc("");
      const listRes = await fetch("/api/workspaces");
      if (listRes.ok) {
        const listJson = await listRes.json();
        setWorkspaces(listJson.workspaces);
        setActiveWsId(json.workspace.id);
      }
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Équipe & Collaboration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez vos espaces de travail, invitations et permissions RBAC côté serveur.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Select
            value={activeWsId}
            onChange={(e) => setActiveWsId(e.target.value)}
            className="w-52"
            aria-label="Choisir un espace"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.role})
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => setWsModalOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvel espace
          </Button>
        </div>
      </div>

      {/* Received Invitations */}
      {receivedInvites.length > 0 ? (
        <Card className="border-[#22D3EE]/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-[#22D3EE]" /> Invitations reçues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border-subtle bg-secondary-surface p-3.5"
              >
                <div>
                  <p className="font-semibold text-sm">{inv.workspace.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Invité par {inv.invitedBy.name} · Rôle : {inv.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => respondInvitation(inv.id, "accept")}
                  >
                    <Check className="h-3.5 w-3.5" /> Accepter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respondInvitation(inv.id, "decline")}
                  >
                    <X className="h-3.5 w-3.5" /> Refuser
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#7C3AED]" /> Membres de {activeWs?.name}
            </CardTitle>
            <CardDescription>Rôles : Propriétaire, Administrateur, Membre, Lecteur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border-subtle bg-secondary-surface/60 p-3.5"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {m.user.name}{" "}
                    {m.userId === currentUserId ? (
                      <span className="text-xs text-[#22D3EE]">(Vous)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {canAdmin && m.role !== "OWNER" ? (
                    <>
                      <Select
                        value={m.role}
                        onChange={(e) =>
                          changeMemberRole(m.id, e.target.value as "ADMIN" | "MEMBER" | "VIEWER")
                        }
                        className="h-8 w-32 text-xs"
                        aria-label={`Rôle de ${m.user.name}`}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Membre</option>
                        <option value="VIEWER">Lecteur</option>
                      </Select>
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        aria-label={`Retirer ${m.user.name}`}
                        className="p-1.5 text-muted-foreground hover:text-danger cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <Badge variant="violet">
                      <Shield className="h-3 w-3" /> {m.role}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#22D3EE]" /> Inviter un collaborateur
            </CardTitle>
            <CardDescription>
              L&apos;utilisateur recevra une invitation dans son compte NEXORA et par e-mail (si
              SMTP configuré).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {canAdmin ? (
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="inv-email" className="text-xs text-muted-foreground">
                    Adresse e-mail
                  </label>
                  <Input
                    id="inv-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collegue@entreprise.fr"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="inv-role" className="text-xs text-muted-foreground">
                    Rôle attribué
                  </label>
                  <Select
                    id="inv-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER" | "VIEWER")}
                  >
                    <option value="ADMIN">Administrateur</option>
                    <option value="MEMBER">Membre</option>
                    <option value="VIEWER">Lecteur (lecture seule)</option>
                  </Select>
                </div>
                <Button type="submit" className="w-full" isLoading={inviting}>
                  Envoyer l&apos;invitation
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Seuls les propriétaires et administrateurs peuvent inviter des membres.
              </p>
            )}

            {sentInvites.length > 0 ? (
              <div className="border-t border-border-subtle pt-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Invitations en attente
                </p>
                {sentInvites.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-xs rounded-lg border border-border-subtle bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.email}</p>
                      <p className="text-muted-foreground">
                        {s.role} · Expire le {formatDateFr(s.expiresAt)}
                      </p>
                    </div>
                    {canAdmin ? (
                      <button
                        type="button"
                        onClick={() => revokeInvite(s.id)}
                        className="text-danger hover:underline cursor-pointer"
                      >
                        Révoquer
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={wsModalOpen}
        onClose={() => setWsModalOpen(false)}
        title="Créer un espace de travail"
      >
        <form onSubmit={createWorkspace} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="ws-name" className="text-xs text-muted-foreground">
              Nom de l&apos;espace
            </label>
            <Input
              id="ws-name"
              required
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="Ex. Équipe Ingénierie"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ws-desc" className="text-xs text-muted-foreground">
              Description
            </label>
            <Input id="ws-desc" value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setWsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer l&apos;espace</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
