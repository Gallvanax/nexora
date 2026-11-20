"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, KeyRound, MonitorSmartphone, ShieldAlert, Trash2, User } from "lucide-react";
import { formatRelativeTimeFr } from "@/lib/utils";
import { useTheme, type ThemePreference } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";

interface SessionItem {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export function SettingsClient({
  initialUser,
  initialPreferences,
  initialSessions,
  hasLocalPassword,
}: {
  initialUser: {
    id: string;
    name: string;
    email: string;
    jobTitle: string | null;
    bio: string | null;
    avatarUrl: string | null;
  };
  initialPreferences: {
    theme: ThemePreference;
    language: string;
    timezone: string;
    defaultProjectView: "GRID" | "LIST" | "KANBAN";
    emailNotifications: boolean;
    dueSoonReminders: boolean;
    mentionAlerts: boolean;
    projectUpdates: boolean;
  };
  initialSessions: SessionItem[];
  hasLocalPassword: boolean;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();

  // Profile state
  const [name, setName] = React.useState(initialUser.name);
  const [jobTitle, setJobTitle] = React.useState(initialUser.jobTitle ?? "");
  const [bio, setBio] = React.useState(initialUser.bio ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(initialUser.avatarUrl ?? "");
  const [savingProfile, setSavingProfile] = React.useState(false);

  // Preferences state
  const [themePref, setThemePref] = React.useState<ThemePreference>(initialPreferences.theme);
  const [language, setLanguage] = React.useState(initialPreferences.language);
  const [timezone, setTimezone] = React.useState(initialPreferences.timezone);
  const [emailNotifications, setEmailNotifications] = React.useState(
    initialPreferences.emailNotifications
  );
  const [dueSoonReminders, setDueSoonReminders] = React.useState(
    initialPreferences.dueSoonReminders
  );
  const [mentionAlerts, setMentionAlerts] = React.useState(initialPreferences.mentionAlerts);
  const [projectUpdates, setProjectUpdates] = React.useState(initialPreferences.projectUpdates);
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [savingPass, setSavingPass] = React.useState(false);

  // Sessions
  const [sessions, setSessions] = React.useState(initialSessions);

  // Delete account modal
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: name.trim(),
            jobTitle: jobTitle.trim() || null,
            bio: bio.trim() || null,
            avatarUrl: avatarUrl.trim() || null,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Profil mis à jour.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de sauvegarde.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            theme: themePref,
            language,
            timezone,
            emailNotifications,
            dueSoonReminders,
            mentionAlerts,
            projectUpdates,
          },
        }),
      });
      if (!res.ok) throw new Error();
      setTheme(themePref, false);
      toast.success("Préférences enregistrées.");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPass(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Mot de passe modifié. Les autres sessions ont été déconnectées.");
      setCurrentPassword("");
      setNewPassword("");
      const sessRes = await fetch("/api/auth/sessions");
      if (sessRes.ok) {
        const s = await sessRes.json();
        setSessions(s.sessions);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de modifier le mot de passe.");
    } finally {
      setSavingPass(false);
    }
  };

  const revokeSession = async (id: string) => {
    const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      const json = await res.json();
      toast.success("Session révoquée.");
      if (json.revokedCurrent) {
        router.push("/connexion");
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    }
  };

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: deleteConfirm,
          ...(hasLocalPassword ? { password: deletePassword } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Compte supprimé définitivement.");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profil & Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisez votre compte, vos notifications, votre sécurité et vos exports.
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#7C3AED]" /> Informations personnelles
          </CardTitle>
          <CardDescription>Ces informations sont persistées dans votre profil.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="sp-name" className="text-xs text-muted-foreground">
                  Nom complet
                </label>
                <Input
                  id="sp-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="sp-email" className="text-xs text-muted-foreground">
                  E-mail (identifiant)
                </label>
                <Input id="sp-email" value={initialUser.email} disabled />
              </div>
              <div className="space-y-1">
                <label htmlFor="sp-job" className="text-xs text-muted-foreground">
                  Rôle / Fonction
                </label>
                <Input
                  id="sp-job"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex. Développeur, Étudiant, Product Manager"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="sp-avatar" className="text-xs text-muted-foreground">
                  URL photo de profil
                </label>
                <Input
                  id="sp-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="sp-bio" className="text-xs text-muted-foreground">
                Bio
              </label>
              <Textarea id="sp-bio" value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <Button type="submit" isLoading={savingProfile}>
              Enregistrer le profil
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Apparence, Fuseau horaire & Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePreferences} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="pref-theme" className="text-xs text-muted-foreground">
                  Thème
                </label>
                <Select
                  id="pref-theme"
                  value={themePref}
                  onChange={(e) => setThemePref(e.target.value as ThemePreference)}
                >
                  <option value="DARK">Sombre</option>
                  <option value="LIGHT">Clair</option>
                  <option value="SYSTEM">Système</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="pref-lang" className="text-xs text-muted-foreground">
                  Langue
                </label>
                <Select
                  id="pref-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="pref-tz" className="text-xs text-muted-foreground">
                  Fuseau horaire
                </label>
                <Select id="pref-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="UTC">UTC</option>
                  <option value="America/Montreal">America/Montreal</option>
                  <option value="America/New_York">America/New_York</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                {
                  label: "Notifications par e-mail (si SMTP actif)",
                  checked: emailNotifications,
                  set: setEmailNotifications,
                },
                {
                  label: "Rappels d'échéances proches",
                  checked: dueSoonReminders,
                  set: setDueSoonReminders,
                },
                {
                  label: "Alertes de commentaires et attributions",
                  checked: mentionAlerts,
                  set: setMentionAlerts,
                },
                {
                  label: "Mises à jour de projets",
                  checked: projectUpdates,
                  set: setProjectUpdates,
                },
              ].map((toggle) => (
                <label
                  key={toggle.label}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle bg-secondary-surface p-3 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={toggle.checked}
                    onChange={(e) => toggle.set(e.target.checked)}
                    className="accent-[#7C3AED]"
                  />
                  <span>{toggle.label}</span>
                </label>
              ))}
            </div>

            <Button type="submit" isLoading={savingPrefs}>
              Enregistrer les préférences
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password & Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#22D3EE]" /> Sécurité du mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasLocalPassword ? (
              <form onSubmit={changePassword} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="cp-cur" className="text-xs text-muted-foreground">
                    Mot de passe actuel
                  </label>
                  <Input
                    id="cp-cur"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="cp-new" className="text-xs text-muted-foreground">
                    Nouveau mot de passe
                  </label>
                  <Input
                    id="cp-new"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary" isLoading={savingPass}>
                  Modifier le mot de passe
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Votre compte est connecté via OAuth externe sans mot de passe local.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-[#3B82F6]" /> Sessions actives
            </CardTitle>
            <CardDescription>Révoquez tout appareil suspect en un clic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-64 overflow-y-auto">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-secondary-surface p-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {s.userAgent} {s.isCurrent ? <Badge variant="cyan">Actuelle</Badge> : null}
                  </p>
                  <p className="text-muted-foreground">
                    IP {s.ipAddress} · Actif {formatRelativeTimeFr(s.lastActiveAt)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => revokeSession(s.id)}>
                  Révoquer
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Export & Account Deletion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-[#22C55E]" /> Export de vos données
            </CardTitle>
            <CardDescription>
              Téléchargez l&apos;ensemble de vos projets, tâches, événements et objectifs autorisés.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a href="/api/profile/export?format=json">
              <Button variant="secondary" type="button">
                <Download className="h-4 w-4" /> Exporter en JSON
              </Button>
            </a>
            <a href="/api/profile/export?format=csv">
              <Button variant="secondary" type="button">
                <Download className="h-4 w-4" /> Exporter en CSV
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-danger">
              <ShieldAlert className="h-4 w-4" /> Zone de danger
            </CardTitle>
            <CardDescription>
              La suppression du compte est définitive et irréversible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirmer la suppression du compte"
        description="Cette action supprimera définitivement votre profil et vos données personnelles."
      >
        <form onSubmit={deleteAccount} className="space-y-4">
          {hasLocalPassword ? (
            <div className="space-y-1">
              <label htmlFor="del-pass" className="text-xs text-muted-foreground">
                Votre mot de passe
              </label>
              <Input
                id="del-pass"
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="del-confirm" className="text-xs text-muted-foreground">
              Tapez <strong>SUPPRIMER</strong> pour confirmer
            </label>
            <Input
              id="del-confirm"
              required
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SUPPRIMER"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={deleteConfirm !== "SUPPRIMER"}
              isLoading={deleting}
            >
              Supprimer définitivement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
