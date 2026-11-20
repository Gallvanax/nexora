import { describe, expect, it } from "vitest";
import { computeAnalyticsSummary } from "@/services/analytics";

describe("Calculs analytiques NEXORA", () => {
  it("gère proprement une période sans aucune tâche", () => {
    const summary = computeAnalyticsSummary([], 30, new Date("2026-11-18T12:00:00Z"));
    expect(summary.totalTasks).toBe(0);
    expect(summary.completedTasks).toBe(0);
    expect(summary.completionRate).toBe(0);
    expect(summary.onTimeRate).toBe(100);
    expect(summary.weeklySeries.length).toBeGreaterThan(0);
  });

  it("calcule correctement le taux de réalisation et le respect des échéances", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    const twoDaysAgo = new Date("2026-11-16T12:00:00Z");
    const tomorrow = new Date("2026-11-19T12:00:00Z");
    const yesterday = new Date("2026-11-17T12:00:00Z");

    const summary = computeAnalyticsSummary(
      [
        {
          id: "t1",
          status: "DONE",
          priority: "HIGH",
          dueDate: tomorrow,
          completedAt: twoDaysAgo,
          createdAt: twoDaysAgo,
          projectId: "p1",
          projectName: "Alpha",
          projectColor: "#7C3AED",
        },
        {
          id: "t2",
          status: "DONE",
          priority: "URGENT",
          dueDate: twoDaysAgo,
          completedAt: now, // terminée 2 jours après dueDate (> 24h)
          createdAt: twoDaysAgo,
          projectId: "p1",
          projectName: "Alpha",
          projectColor: "#7C3AED",
        },
        {
          id: "t3",
          status: "IN_PROGRESS",
          priority: "NORMAL",
          dueDate: tomorrow,
          completedAt: null,
          createdAt: twoDaysAgo,
          projectId: "p2",
          projectName: "Beta",
          projectColor: "#22D3EE",
        },
        {
          id: "t4",
          status: "TODO",
          priority: "LOW",
          dueDate: yesterday, // en retard
          completedAt: null,
          createdAt: twoDaysAgo,
          projectId: "p2",
          projectName: "Beta",
          projectColor: "#22D3EE",
        },
      ],
      30,
      now
    );

    expect(summary.totalTasks).toBe(4);
    expect(summary.completedTasks).toBe(2);
    expect(summary.inProgressTasks).toBe(1);
    expect(summary.completionRate).toBe(50);
    expect(summary.onTimeRate).toBe(50);
    expect(summary.dueSoonCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.projectBreakdown).toHaveLength(2);
  });
});
