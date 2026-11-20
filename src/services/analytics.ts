import type { TaskPriority, TaskStatus } from "@prisma/client";

export interface AnalyticsTaskInput {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  projectId: string;
  projectName: string;
  projectColor: string;
}

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
  onTimeRate: number;
  dueSoonCount: number;
  overdueCount: number;
  weeklySeries: Array<{
    label: string;
    completed: number;
    created: number;
  }>;
  priorityBreakdown: Array<{
    priority: string;
    key: TaskPriority;
    count: number;
    color: string;
  }>;
  projectBreakdown: Array<{
    projectId: string;
    name: string;
    color: string;
    total: number;
    completed: number;
    rate: number;
  }>;
}

const PRIORITY_LABELS: Record<TaskPriority, { label: string; color: string }> = {
  URGENT: { label: "Urgente", color: "#EF4444" },
  HIGH: { label: "Haute", color: "#F59E0B" },
  NORMAL: { label: "Normale", color: "#3B82F6" },
  LOW: { label: "Basse", color: "#94A3B8" },
};

/**
 * Calcule les indicateurs analytiques réels à partir des tâches et projets autorisés.
 * - Taux de réalisation = tâches terminées / total des tâches dans la fenêtre (%)
 * - Respect des échéances = tâches terminées avant ou le jour de leur dueDate / tâches terminées avec une dueDate (%)
 */
export function computeAnalyticsSummary(
  tasks: AnalyticsTaskInput[],
  daysWindow: number,
  now = new Date()
): AnalyticsSummary {
  const windowStart = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);
  const inWindow = tasks.filter(
    (t) => t.createdAt >= windowStart || (t.completedAt && t.completedAt >= windowStart)
  );

  const totalTasks = inWindow.length;
  const completedTasks = inWindow.filter((t) => t.status === "DONE").length;
  const inProgressTasks = inWindow.filter((t) => t.status === "IN_PROGRESS").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedWithDue = inWindow.filter(
    (t) => t.status === "DONE" && t.dueDate && t.completedAt
  );
  const completedOnTime = completedWithDue.filter(
    (t) => t.completedAt!.getTime() <= t.dueDate!.getTime() + 24 * 60 * 60 * 1000
  );
  const onTimeRate =
    completedWithDue.length > 0
      ? Math.round((completedOnTime.length / completedWithDue.length) * 100)
      : 100;

  const next72h = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dueSoonCount = tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate >= now && t.dueDate <= next72h
  ).length;
  const overdueCount = tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate < now
  ).length;

  // Build day-by-day or bucketed series
  const buckets = daysWindow <= 7 ? 7 : daysWindow <= 30 ? 6 : 8;
  const bucketMs = (daysWindow * 24 * 60 * 60 * 1000) / buckets;
  const weeklySeries = Array.from({ length: buckets }, (_, idx) => {
    const start = new Date(windowStart.getTime() + idx * bucketMs);
    const end = new Date(windowStart.getTime() + (idx + 1) * bucketMs);
    const label = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(end);

    const created = inWindow.filter((t) => t.createdAt >= start && t.createdAt < end).length;
    const completed = inWindow.filter(
      (t) => t.completedAt && t.completedAt >= start && t.completedAt < end
    ).length;

    return { label, completed, created };
  });

  const priorityBreakdown = (["URGENT", "HIGH", "NORMAL", "LOW"] as TaskPriority[]).map((key) => ({
    key,
    priority: PRIORITY_LABELS[key].label,
    color: PRIORITY_LABELS[key].color,
    count: inWindow.filter((t) => t.priority === key).length,
  }));

  const projectMap = new Map<
    string,
    { projectId: string; name: string; color: string; total: number; completed: number }
  >();
  for (const t of inWindow) {
    const entry = projectMap.get(t.projectId) ?? {
      projectId: t.projectId,
      name: t.projectName,
      color: t.projectColor,
      total: 0,
      completed: 0,
    };
    entry.total += 1;
    if (t.status === "DONE") entry.completed += 1;
    projectMap.set(t.projectId, entry);
  }

  const projectBreakdown = Array.from(projectMap.values())
    .map((p) => ({
      ...p,
      rate: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    completionRate,
    onTimeRate,
    dueSoonCount,
    overdueCount,
    weeklySeries,
    priorityBreakdown,
    projectBreakdown,
  };
}
