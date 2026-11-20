import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/auth/crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquant pour le seed.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Initialisation des données de démonstration NEXORA...");

  const demoPassword = await hashPassword("NexoraDemo#2026");

  const camille = await prisma.user.upsert({
    where: { email: "camille.demo@nexora.app" },
    update: {},
    create: {
      name: "Camille Laurent (Démo)",
      email: "camille.demo@nexora.app",
      emailVerified: new Date(),
      passwordHash: demoPassword,
      jobTitle: "Chef de produit (Compte démo)",
      bio: "Compte fictif de démonstration pour explorer NEXORA.",
      preferences: {
        create: {
          theme: "DARK",
          language: "fr",
          timezone: "Europe/Paris",
          defaultProjectView: "GRID",
        },
      },
    },
  });

  const thomas = await prisma.user.upsert({
    where: { email: "thomas.demo@nexora.app" },
    update: {},
    create: {
      name: "Thomas Moreau (Démo)",
      email: "thomas.demo@nexora.app",
      emailVerified: new Date(),
      passwordHash: demoPassword,
      jobTitle: "Développeur Full-Stack (Compte démo)",
      preferences: {
        create: {
          theme: "DARK",
          language: "fr",
          timezone: "Europe/Paris",
          defaultProjectView: "KANBAN",
        },
      },
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "atelier-nexora-demo" },
    update: {},
    create: {
      name: "Atelier Produit (Démo)",
      slug: "atelier-nexora-demo",
      description: "Espace collaboratif de démonstration avec données fictives.",
      ownerId: camille.id,
      members: {
        createMany: {
          data: [
            { userId: camille.id, role: "OWNER" },
            { userId: thomas.id, role: "ADMIN" },
          ],
        },
      },
    },
  });

  const existingProjects = await prisma.project.count({
    where: { workspaceId: workspace.id },
  });

  if (existingProjects === 0) {
    const labels = await Promise.all(
      [
        { name: "Urgent", color: "#EF4444" },
        { name: "Produit", color: "#7C3AED" },
        { name: "Design", color: "#22D3EE" },
        { name: "Ingénierie", color: "#3B82F6" },
      ].map((l) =>
        prisma.label.upsert({
          where: { workspaceId_name: { workspaceId: workspace.id, name: l.name } },
          update: {},
          create: { workspaceId: workspace.id, name: l.name, color: l.color },
        })
      )
    );

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const projectA = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        ownerId: camille.id,
        name: "Refonte Portail Client (Démo)",
        description: "Projet exemple : refonte complète de l'espace client et des parcours clés.",
        color: "#7C3AED",
        icon: "sparkles",
        status: "ACTIVE",
        deadline: new Date(now.getTime() + 18 * dayMs),
        templateKey: "software",
        members: {
          createMany: {
            data: [
              { userId: camille.id, role: "OWNER", isFavorite: true },
              { userId: thomas.id, role: "ADMIN", isFavorite: true },
            ],
          },
        },
      },
    });

    const projectB = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        ownerId: camille.id,
        name: "Mémoire Master IA & UX (Démo)",
        description: "Projet exemple étudiant : recherche, rédaction et soutenance.",
        color: "#22D3EE",
        icon: "graduation-cap",
        status: "ACTIVE",
        deadline: new Date(now.getTime() + 30 * dayMs),
        templateKey: "school",
        members: {
          create: { userId: camille.id, role: "OWNER", isFavorite: false },
        },
      },
    });

    await prisma.task.create({
      data: {
        code: "NX-1",
        projectId: projectA.id,
        creatorId: camille.id,
        assigneeId: thomas.id,
        title: "Concevoir le système de permissions RBAC",
        description: "Vérifier l'isolation stricte des ressources par espace de travail.",
        status: "DONE",
        priority: "HIGH",
        position: 0,
        dueDate: new Date(now.getTime() - 2 * dayMs),
        completedAt: new Date(now.getTime() - 3 * dayMs),
        loggedMinutes: 140,
        labels: { create: [{ labelId: labels[3].id }] },
        subtasks: {
          create: [
            { title: "Matrice rôles OWNER / ADMIN / MEMBER / VIEWER", isCompleted: true, position: 0 },
            { title: "Tests anti-IDOR", isCompleted: true, position: 1 },
          ],
        },
      },
    });

    const t2 = await prisma.task.create({
      data: {
        code: "NX-2",
        projectId: projectA.id,
        creatorId: camille.id,
        assigneeId: camille.id,
        title: "Finaliser les écrans d'analytique hebdomadaire",
        description: "Intégrer les graphiques Recharts branchés sur PostgreSQL.",
        status: "IN_PROGRESS",
        priority: "URGENT",
        position: 1,
        dueDate: new Date(now.getTime() + 2 * dayMs),
        estimatedMinutes: 180,
        loggedMinutes: 75,
        labels: { create: [{ labelId: labels[1].id }, { labelId: labels[2].id }] },
        subtasks: {
          create: [
            { title: "Graphique activité hebdomadaire", isCompleted: true, position: 0 },
            { title: "Filtres 7j / 30j / 90j", isCompleted: false, position: 1 },
          ],
        },
      },
    });

    await prisma.task.create({
      data: {
        code: "NX-3",
        projectId: projectA.id,
        creatorId: thomas.id,
        assigneeId: thomas.id,
        title: "Revue accessibilité WCAG 2.2 AA",
        description: "Contrôler contrastes, focus visible et navigation clavier.",
        status: "TODO",
        priority: "NORMAL",
        position: 2,
        dueDate: new Date(now.getTime() + 5 * dayMs),
        recurrence: "WEEKLY",
        labels: { create: [{ labelId: labels[2].id }] },
      },
    });

    await prisma.task.create({
      data: {
        code: "NX-4",
        projectId: projectB.id,
        creatorId: camille.id,
        assigneeId: camille.id,
        title: "Synthétiser 8 articles scientifiques de référence",
        status: "IN_PROGRESS",
        priority: "HIGH",
        position: 0,
        dueDate: new Date(now.getTime() + 4 * dayMs),
      },
    });

    await prisma.comment.create({
      data: {
        taskId: t2.id,
        authorId: thomas.id,
        content: "Les agrégations API sont prêtes sur `/api/analytics`, prêtes pour le branchement UI.",
      },
    });

    await prisma.event.createMany({
      data: [
        {
          workspaceId: workspace.id,
          projectId: projectA.id,
          creatorId: camille.id,
          title: "Point Sprint Hebdomadaire (Démo)",
          description: "Revue de l'avancement et des échéances de la semaine.",
          startAt: new Date(now.getTime() + 1 * dayMs + 9 * 60 * 60 * 1000),
          endAt: new Date(now.getTime() + 1 * dayMs + 10 * 60 * 60 * 1000),
          timezone: "Europe/Paris",
          recurrence: "WEEKLY",
          color: "#7C3AED",
          location: "Visio NEXORA",
        },
        {
          workspaceId: workspace.id,
          projectId: projectB.id,
          creatorId: camille.id,
          title: "Atelier Revue UX (Démo)",
          startAt: new Date(now.getTime() + 3 * dayMs + 14 * 60 * 60 * 1000),
          endAt: new Date(now.getTime() + 3 * dayMs + 15 * 60 * 60 * 1000),
          timezone: "Europe/Paris",
          color: "#22D3EE",
        },
      ],
    });

    await prisma.goal.createMany({
      data: [
        {
          workspaceId: workspace.id,
          projectId: projectA.id,
          ownerId: camille.id,
          title: "Atteindre 90 % de tâches livrées à l'échéance",
          description: "Objectif qualité trimestriel de l'atelier produit.",
          currentValue: 82,
          targetValue: 90,
          unit: "%",
          dueDate: new Date(now.getTime() + 25 * dayMs),
          status: "ON_TRACK",
        },
        {
          workspaceId: workspace.id,
          projectId: projectB.id,
          ownerId: camille.id,
          title: "Finaliser les 4 chapitres du mémoire",
          currentValue: 2,
          targetValue: 4,
          unit: "chapitres",
          dueDate: new Date(now.getTime() + 28 * dayMs),
          status: "ON_TRACK",
        },
      ],
    });

    await prisma.notification.create({
      data: {
        userId: camille.id,
        type: "DUE_SOON",
        title: "Échéance proche : NX-2",
        message: "La tâche « Finaliser les écrans d'analytique hebdomadaire » arrive à échéance dans 2 jours.",
        link: `/projets/${projectA.id}`,
      },
    });
  }

  console.log("Seed NEXORA terminé avec succès !");
  console.log("Compte démo disponible : camille.demo@nexora.app / NexoraDemo#2026");
}

main()
  .catch((err) => {
    console.error("Erreur durant le seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
