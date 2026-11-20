"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  FolderKanban,
  MailCheck,
  Plus,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { AnalyticsSummary } from "@/services/analytics";
import { formatDateFr, formatRelativeTimeFr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export interface OverviewData {
  userName: string;
  emailVerified: boolean;
  stats: {
    activeProjects: number;
    inProgressTasks: number;
    completedTasks: number;
    dueSoonCount: number;
    globalProgress: number;
  };
  analytics: AnalyticsSummary;
  priorityTasks: Array<{
    id: string;
    code: string;
    title: string;
    status: "TODO" | "IN_PROGRESS" | "ON_HOLD" | "DONE";
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    dueDate: string | null;
    projectId: string;
    projectName: string;
    projectColor: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    code: string;
    title: string;
    dueDate: string;
    projectId: string;
    projectName: string;
  }>;
  favoriteProjects: Array<{
    id: string;
    name: string;
    color: string;
    progress: number;
    totalTasks: number;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    actorName: string;
    createdAt: string;
    projectName: string | null;
  }>;
  calendarDaysWithItems: number[];
}

function formatActionLabel(action: string): string {
  const map: Record<string, string> = {
    "workspace.created": "a créé l'espace de travail",
    "workspace.member_invited": "a invité un collaborateur",
    "workspace.invitation_accepted": "a rejoint l'espace",
    "project.created": "a créé un projet",
    "project.updated": "a mis à jour un projet",
    "project.archived": "a archivé un projet",
    "project.restored": "a restauré un projet",
    "task.created": "a créé une tâche",
    "task.updated": "a modifié une tâche",
    "task.status_changed": "a changé le statut d'une tâche",
    "comment.created": "a ajouté un commentaire",
    "attachment.uploaded": "a ajouté une pièce jointe",
    "event.created": "a planifié un événement",
    "goal.created": "a défini un objectif",
  };
  return map[action] ?? action;
}

export function OverviewClient({ data }: { data: OverviewData }) {
  const router = useRouter();
  const [resending, setResending] = React.useState(false);
  const [previewVerifyUrl, setPreviewVerifyUrl] = React.useState<string | null>(null);
  const [tasks, setTasks] = React.useState(data.priorityTasks);

  const firstName = data.userName.split(" ")[0] || data.userName;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const monthTitle = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(now);

  const resendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify-email", { method: "PUT" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.previewUrl) {
        setPreviewVerifyUrl(json.previewUrl);
        toast.success("Lien de vérification généré (mode dev).");
      } else {
        toast.success("E-mail de vérification envoyé.");
      }
    } catch {
      toast.error("Impossible de générer le lien de vérification.");
    } finally {
      setResending(false);
    }
  };

  const quickToggleDone = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(nextStatus === "DONE" ? "Tâche marquée terminée." : "Tâche rouverte.");
      router.refresh();
    } catch {
      setTasks(data.priorityTasks);
      toast.error("Impossible de mettre à jour la tâche.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Bonjour, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Voici l&apos;état en temps réel de vos projets, tâches et prochaines échéances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/projets?new=1">
            <Button size="md">
              <Plus className="h-4 w-4" /> Nouveau projet
            </Button>
          </Link>
          <Link href="/taches?new=1">
            <Button variant="secondary" size="md">
              Nouvelle tâche
            </Button>
          </Link>
        </div>
      </div>

      {!data.emailVerified ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2.5">
            <MailCheck className="h-4 w-4 text-warning shrink-0" />
            <span className="text-foreground">
              Votre adresse e-mail n&apos;est pas encore vérifiée.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {previewVerifyUrl ? (
              <a href={previewVerifyUrl} className="text-xs font-mono text-[#22D3EE] underline">
                Ouvrir le lien de vérification
              </a>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resendVerification}
                isLoading={resending}
              >
                Vérifier mon e-mail
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Projets actifs",
            value: data.stats.activeProjects,
            hint: "En cours dans vos espaces",
            icon: FolderKanban,
            accent: "text-[#7C3AED]",
          },
          {
            label: "Tâches en cours",
            value: data.stats.inProgressTasks,
            hint: "Actuellement en production",
            icon: Clock,
            accent: "text-[#3B82F6]",
          },
          {
            label: "Tâches terminées",
            value: data.stats.completedTasks,
            hint: "Sur les 30 derniers jours",
            icon: CheckCircle2,
            accent: "text-[#22C55E]",
          },
          {
            label: "Échéances proches",
            value: data.stats.dueSoonCount,
            hint: "Dans les 72 prochaines heures",
            icon: AlertTriangle,
            accent: "text-[#F59E0B]",
          },
          {
            label: "Progression globale",
            value: `${data.stats.globalProgress}%`,
            hint: "Taux de complétion global",
            icon: TrendingUp,
            accent: "text-[#22D3EE]",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <Icon className={`h-4 w-4 ${kpi.accent}`} />
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                {kpi.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid (4 Charts from Real DB Data) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité hebdomadaire</CardTitle>
            <CardDescription>
              Comparaison entre tâches créées et tâches terminées (30 derniers jours)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {data.analytics.totalTasks === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Aucune donnée sur cette période"
                description="Créez votre premier projet ou tâche pour visualiser votre courbe d'activité."
                className="h-full py-6"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.analytics.weeklySeries}>
                  <defs>
                    <linearGradient id="ovDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ovCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      color: "#F8FAFC",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Créées"
                    stroke="#7C3AED"
                    fill="url(#ovCreated)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Terminées"
                    stroke="#22D3EE"
                    fill="url(#ovDone)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tâches terminées par période & Répartition</CardTitle>
            <CardDescription>Volume achevé et distribution par priorité</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-64">
            {data.analytics.totalTasks === 0 ? (
              <div className="sm:col-span-2 h-full">
                <EmptyState
                  icon={FolderKanban}
                  title="En attente de tâches"
                  description="Les graphiques de productivité s'actualisent automatiquement dès la première tâche."
                  className="h-full py-6"
                />
              </div>
            ) : (
              <>
                <div className="h-full min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.analytics.weeklySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111827",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                          color: "#F8FAFC",
                        }}
                      />
                      <Bar
                        dataKey="completed"
                        name="Terminées"
                        fill="#3B82F6"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-full min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.analytics.projectBreakdown}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={38}
                        outerRadius={68}
                        paddingAngle={3}
                      >
                        {data.analytics.projectBreakdown.map((entry) => (
                          <Cell key={entry.projectId} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111827",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "12px",
                          color: "#F8FAFC",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5 Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Priority Tasks */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tâches prioritaires</CardTitle>
              <CardDescription>Vos actions les plus urgentes à traiter</CardDescription>
            </div>
            <Link href="/taches" className="text-xs font-medium text-[#22D3EE] hover:underline">
              Tout voir <ArrowRight className="inline h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Aucune tâche en attente"
                description="Créez une tâche depuis un projet pour démarrer votre suivi."
                action={
                  <Link href="/projets?new=1">
                    <Button size="sm">Créer un projet</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-secondary-surface/60 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => quickToggleDone(task.id, task.status)}
                        aria-label={`Basculer le statut de ${task.title}`}
                        className="cursor-pointer shrink-0"
                      >
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            task.status === "DONE"
                              ? "text-[#22C55E]"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        />
                      </button>
                      <Link href={`/projets/${task.projectId}`} className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            task.status === "DONE"
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          <span className="mr-2 font-mono text-xs text-[#22D3EE]">{task.code}</span>
                          {task.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {task.projectName}
                          {task.dueDate ? ` · Échéance ${formatDateFr(task.dueDate)}` : ""}
                        </p>
                      </Link>
                    </div>
                    <Badge
                      variant={
                        task.priority === "URGENT"
                          ? "danger"
                          : task.priority === "HIGH"
                            ? "warning"
                            : "blue"
                      }
                    >
                      {task.priority === "URGENT"
                        ? "Urgente"
                        : task.priority === "HIGH"
                          ? "Haute"
                          : task.priority === "NORMAL"
                            ? "Normale"
                            : "Basse"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Calendar + Favorite Projects */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="capitalize">{monthTitle}</CardTitle>
                <CardDescription>Calendrier miniature</CardDescription>
              </div>
              <Link
                href="/calendrier"
                className="text-xs font-medium text-[#22D3EE] hover:underline"
              >
                Ouvrir <CalendarIcon className="inline h-3.5 w-3.5 ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1.5">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const isToday = day === now.getDate();
                  const hasItem = data.calendarDaysWithItems.includes(day);
                  return (
                    <Link
                      key={day}
                      href="/calendrier"
                      className={`relative flex h-8 items-center justify-center rounded-lg transition ${
                        isToday
                          ? "bg-[#7C3AED] text-white font-bold"
                          : "hover:bg-elevated text-foreground"
                      }`}
                    >
                      {day}
                      {hasItem && !isToday ? (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#22D3EE]" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Projets favoris</CardTitle>
              <Link href="/projets" className="text-xs text-[#22D3EE] hover:underline">
                Tous les projets
              </Link>
            </CardHeader>
            <CardContent>
              {data.favoriteProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Ajoutez une étoile à un projet pour le retrouver ici.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.favoriteProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projets/${p.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-secondary-surface/60 px-3.5 py-2.5 hover:border-[#7C3AED]/50 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[#22D3EE]">{p.progress}%</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Prochaines échéances</CardTitle>
            <CardDescription>Tâches datées à venir</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune échéance à venir pour le moment.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.upcomingDeadlines.map((d) => (
                  <Link
                    key={d.id}
                    href={`/projets/${d.projectId}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-secondary-surface/50 px-3.5 py-2.5 hover:border-border-strong"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        <span className="mr-2 font-mono text-xs text-[#22D3EE]">{d.code}</span>
                        {d.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{d.projectName}</p>
                    </div>
                    <Badge variant="warning">{formatDateFr(d.dueDate)}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Activités récentes</CardTitle>
            <CardDescription>Journal en temps réel de votre espace</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune activité enregistrée pour l&apos;instant.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-3 border-b border-border-subtle last:border-0 pb-2.5 last:pb-0 text-sm"
                  >
                    <p className="text-foreground">
                      <span className="font-semibold">{act.actorName}</span>{" "}
                      <span className="text-muted-foreground">{formatActionLabel(act.action)}</span>
                      {act.projectName ? (
                        <span className="text-[#22D3EE]"> · {act.projectName}</span>
                      ) : null}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeTimeFr(act.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
