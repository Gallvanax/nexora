import type { TaskPriority, TaskStatus } from "@prisma/client";

export interface ProjectTemplate {
  key: "blank" | "school" | "software" | "business" | "personal";
  name: string;
  description: string;
  color: string;
  icon: string;
  tasks: Array<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    subtasks?: string[];
  }>;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    key: "blank",
    name: "Projet vierge",
    description: "Démarrez avec une structure libre adaptée à votre rythme.",
    color: "#7C3AED",
    icon: "folder-kanban",
    tasks: [],
  },
  {
    key: "school",
    name: "Projet scolaire",
    description: "Planification de cours, recherche, rendu et préparation de soutenance.",
    color: "#3B82F6",
    icon: "graduation-cap",
    tasks: [
      {
        title: "Définir le plan et les sources bibliographiques",
        description: "Collecter les documents de référence et structurer les chapitres.",
        status: "DONE",
        priority: "HIGH",
        subtasks: ["Identifier 5 sources fiables", "Valider la problématique"],
      },
      {
        title: "Rédiger la partie analyse et expérimentation",
        description: "Synthétiser les résultats et préparer les schémas explicatifs.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        subtasks: ["Rédiger le brouillon", "Ajouter les figures"],
      },
      {
        title: "Préparer les diapositives de soutenance",
        description: "Construire un support clair de 10 à 12 diapositives.",
        status: "TODO",
        priority: "NORMAL",
      },
    ],
  },
  {
    key: "software",
    name: "Développement logiciel",
    description: "Spécifications techniques, sprint produit, tests et mise en production.",
    color: "#22D3EE",
    icon: "code-2",
    tasks: [
      {
        title: "Valider l'architecture technique et le schéma DB",
        description: "Revue des modèles relationnels, index et permissions API.",
        status: "DONE",
        priority: "HIGH",
      },
      {
        title: "Développer les endpoints API et validations Zod",
        description: "Implémenter les routes CRUD sécurisées et les tests d'intégration.",
        status: "IN_PROGRESS",
        priority: "URGENT",
        subtasks: ["Schémas Zod", "Contrôles RBAC", "Tests Vitest"],
      },
      {
        title: "Audit sécurité & tests end-to-end Playwright",
        description: "Vérifier les parcours critiques et la conformité WCAG AA.",
        status: "TODO",
        priority: "HIGH",
      },
    ],
  },
  {
    key: "business",
    name: "Gestion d'entreprise",
    description: "Pilotage opérationnel, objectifs trimestriels et suivi clients.",
    color: "#22C55E",
    icon: "briefcase",
    tasks: [
      {
        title: "Finaliser la feuille de route trimestrielle",
        description: "Aligner les objectifs d'équipe et jalons clés.",
        status: "IN_PROGRESS",
        priority: "HIGH",
      },
      {
        title: "Revoir le budget opérationnel et priorités",
        description: "Contrôler les postes principaux et marges.",
        status: "TODO",
        priority: "NORMAL",
      },
      {
        title: "Préparer la revue hebdomadaire d'équipe",
        description: "Compiler les indicateurs et points de blocage.",
        status: "ON_HOLD",
        priority: "NORMAL",
      },
    ],
  },
  {
    key: "personal",
    name: "Organisation personnelle",
    description: "Routines hebdomadaires, apprentissage continu et objectifs personnels.",
    color: "#F59E0B",
    icon: "sparkles",
    tasks: [
      {
        title: "Planifier la semaine et bloquer les créneaux focus",
        description: "Identifier les 3 priorités majeures de la semaine.",
        status: "TODO",
        priority: "HIGH",
      },
      {
        title: "Session de veille et lecture technique (45 min)",
        description: "Prendre des notes structurées sur les points clés.",
        status: "TODO",
        priority: "LOW",
      },
    ],
  },
];

export function getProjectTemplate(key?: string): ProjectTemplate | undefined {
  if (!key) return undefined;
  return PROJECT_TEMPLATES.find((t) => t.key === key);
}
