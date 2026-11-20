"use client";

import * as React from "react";
import { BarChart3, CheckCircle2, Clock, FolderKanban, ShieldCheck } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsSummary } from "@/services/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface AnalyticsResponse extends AnalyticsSummary {
  range: string;
  activeProjectsCount: number;
}

export function AnalyticsClient({ initialData }: { initialData: AnalyticsResponse }) {
  const [range, setRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = React.useState(initialData);
  const [loading, setLoading] = React.useState(false);

  const switchRange = async (next: "7d" | "30d" | "90d") => {
    setRange(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${next}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistiques</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicateurs calculés directement à partir des données enregistrées en base.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-border-subtle bg-secondary-surface p-1 self-start">
          {(
            [
              { id: "7d", label: "7 jours" },
              { id: "30d", label: "30 jours" },
              { id: "90d", label: "90 jours" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchRange(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                range === item.id ? "bg-[#7C3AED] text-white" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${loading ? "opacity-60" : ""}`}
      >
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tâches terminées</span>
            <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{data.completedTasks}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sur {data.totalTasks} tâches suivies
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Taux de réalisation</span>
            <BarChart3 className="h-4 w-4 text-[#7C3AED]" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{data.completionRate}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Terminées / total fenêtre</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Projets actifs</span>
            <FolderKanban className="h-4 w-4 text-[#3B82F6]" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{data.activeProjectsCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Dans vos espaces autorisés</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Respect des échéances</span>
            <ShieldCheck className="h-4 w-4 text-[#22D3EE]" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{data.onTimeRate}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {data.overdueCount} en retard · {data.dueSoonCount} proches
          </p>
        </Card>
      </div>

      {data.totalTasks === 0 ? (
        <EmptyState
          icon={Clock}
          title="Aucune activité sur cette période"
          description="Aucun enregistrement trouvé sur l'intervalle sélectionné. Essayez une fenêtre plus large ou créez une tâche."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Évolution sur la période</CardTitle>
              <CardDescription>Tâches créées vs terminées</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weeklySeries}>
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
                    fill="#7C3AED33"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Terminées"
                    stroke="#22D3EE"
                    fill="#22D3EE33"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par priorité</CardTitle>
              <CardDescription>Distribution des tâches par niveau d&apos;urgence</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.priorityBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="priority" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      color: "#F8FAFC",
                    }}
                  />
                  <Bar dataKey="count" name="Tâches" radius={[8, 8, 0, 0]}>
                    {data.priorityBreakdown.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Activité par projet</CardTitle>
              <CardDescription>Volume total et complétion par projet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.projectBreakdown.map((proj) => (
                <div key={proj.projectId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: proj.color }}
                      />
                      {proj.name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {proj.completed}/{proj.total} ({proj.rate}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${proj.rate}%`, backgroundColor: proj.color }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
