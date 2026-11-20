import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/crypto";
import { requireProjectAccess, requireWorkspaceAccess } from "@/lib/permissions/rbac";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("Tests d'intégration PostgreSQL & Isolation RBAC", () => {
  let ownerId = "";
  let outsiderId = "";
  let viewerId = "";
  let workspaceId = "";
  let projectId = "";

  beforeAll(async () => {
    const passHash = await hashPassword("IntegrationTest#2026");
    const ts = Date.now();

    const [owner, outsider, viewer] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Test Owner",
          email: `owner-${ts}@test.nexora.local`,
          passwordHash: passHash,
        },
      }),
      prisma.user.create({
        data: {
          name: "Test Outsider",
          email: `outsider-${ts}@test.nexora.local`,
          passwordHash: passHash,
        },
      }),
      prisma.user.create({
        data: {
          name: "Test Viewer",
          email: `viewer-${ts}@test.nexora.local`,
          passwordHash: passHash,
        },
      }),
    ]);

    ownerId = owner.id;
    outsiderId = outsider.id;
    viewerId = viewer.id;

    const ws = await prisma.workspace.create({
      data: {
        name: "Espace Test Intégration",
        slug: `ws-test-${ts}`,
        ownerId,
        members: {
          createMany: {
            data: [
              { userId: ownerId, role: "OWNER" },
              { userId: viewerId, role: "VIEWER" },
            ],
          },
        },
      },
    });
    workspaceId = ws.id;

    const proj = await prisma.project.create({
      data: {
        workspaceId,
        ownerId,
        name: "Projet Privé Test",
        members: { create: { userId: ownerId, role: "OWNER" } },
      },
    });
    projectId = proj.id;
  });

  afterAll(async () => {
    if (projectId) await prisma.project.deleteMany({ where: { id: projectId } });
    if (workspaceId) await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    const ids = [ownerId, outsiderId, viewerId].filter(Boolean);
    if (ids.length > 0) await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("autorise le propriétaire sur son espace et son projet", async () => {
    const wsAccess = await requireWorkspaceAccess(ownerId, workspaceId, "OWNER");
    expect(wsAccess.role).toBe("OWNER");

    const projAccess = await requireProjectAccess(ownerId, projectId, "ADMIN");
    expect(projAccess.role).toBe("OWNER");
  });

  it("bloque un utilisateur externe (protection IDOR)", async () => {
    await expect(requireProjectAccess(outsiderId, projectId, "VIEWER")).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(requireWorkspaceAccess(outsiderId, workspaceId, "VIEWER")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("autorise la lecture au lecteur mais interdit l'écriture", async () => {
    const readAccess = await requireProjectAccess(viewerId, projectId, "VIEWER");
    expect(readAccess.role).toBe("VIEWER");

    await expect(requireProjectAccess(viewerId, projectId, "MEMBER")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it("persiste une tâche et met à jour son statut en base", async () => {
    const task = await prisma.task.create({
      data: {
        code: "NX-TEST-1",
        projectId,
        creatorId: ownerId,
        title: "Tâche persistée PostgreSQL",
        status: "TODO",
      },
    });
    expect(task.status).toBe("TODO");

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: new Date() },
    });
    expect(updated.status).toBe("DONE");
    expect(updated.completedAt).not.toBeNull();
  });
});
