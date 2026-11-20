"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  FolderKanban,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NexoraLogo } from "@/components/shared/nexora-logo";
import { InteractiveDemo } from "@/components/marketing/interactive-demo";

const FEATURES = [
  {
    icon: FolderKanban,
    title: "Projets multi-vues",
    description:
      "Basculez instantanément entre grille, liste détaillée et tableau Kanban avec sauvegarde de vos préférences.",
    accent: "text-[#7C3AED] bg-[#7C3AED]/15 border-[#7C3AED]/30",
  },
  {
    icon: Zap,
    title: "Tâches & sous-tâches",
    description:
      "Priorités, récurrences automatiques, pièces jointes sécurisées, commentaires et Mode Concentration intégré.",
    accent: "text-[#3B82F6] bg-[#3B82F6]/15 border-[#3B82F6]/30",
  },
  {
    icon: Calendar,
    title: "Calendrier intelligent",
    description:
      "Vues Mois, Semaine, Jour et Agenda synchronisées avec vos échéances et votre fuseau horaire.",
    accent: "text-[#22D3EE] bg-[#22D3EE]/15 border-[#22D3EE]/30",
  },
  {
    icon: BarChart3,
    title: "Analytique temps réel",
    description:
      "Mesurez votre taux de réalisation, le respect des échéances et la charge par projet à partir des données réelles.",
    accent: "text-[#22C55E] bg-[#22C55E]/15 border-[#22C55E]/30",
  },
  {
    icon: Users,
    title: "Collaboration contrôlée",
    description:
      "Espaces de travail, invitations par e-mail et rôles stricts (Propriétaire, Admin, Membre, Lecteur).",
    accent: "text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/30",
  },
  {
    icon: Target,
    title: "Objectifs & jalons",
    description:
      "Reliez vos tâches quotidiennes à des objectifs mesurables et gardez une visibilité claire sur chaque livraison.",
    accent: "text-[#EC4899] bg-[#EC4899]/15 border-[#EC4899]/30",
  },
];

const PRICING_TIERS = [
  {
    name: "Découverte",
    price: "0 €",
    period: "/ mois",
    subtitle: "Idéal pour étudiants, freelances et organisation personnelle.",
    highlight: false,
    cta: "Commencer gratuitement",
    href: "/inscription",
    items: [
      "Espace de travail personnel",
      "Projets actifs et vues Grille / Liste / Kanban",
      "Calendrier complet et suivi des échéances",
      "Mode Concentration & export CSV / JSON",
    ],
  },
  {
    name: "Pro",
    price: "12 €",
    period: "/ mois (tarif indicatif)",
    subtitle: "Pour indépendants et créateurs exigeants qui pilotent plusieurs clients.",
    highlight: true,
    cta: "Créer un compte Pro",
    href: "/inscription",
    items: [
      "Espaces de travail multiples illimités",
      "Modèles avancés et tâches récurrentes",
      "Statistiques multi-périodes (7j / 30j / 90j)",
      "Stockage privé des pièces jointes S3",
    ],
  },
  {
    name: "Équipe",
    price: "29 €",
    period: "/ mois (tarif indicatif)",
    subtitle: "Conçu pour startups, studios et petites équipes collaboratives.",
    highlight: false,
    cta: "Lancer un espace équipe",
    href: "/inscription",
    items: [
      "Invitations membres et matrice de rôles RBAC",
      "Journal d'activité détaillé par projet",
      "Notifications centralisées et e-mails SMTP",
      "Contrôle des sessions actives et export global",
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "Combien de temps faut-il pour démarrer sur NEXORA ?",
    a: "Moins de trois minutes : créez votre compte, votre premier espace de travail est provisionné automatiquement, et vous pouvez choisir un modèle (scolaire, logiciel, entreprise ou personnel) dès votre premier projet.",
  },
  {
    q: "Comment mes données et fichiers sont-ils protégés ?",
    a: "Les mots de passe sont hachés avec Argon2id, les sessions utilisent des cookies HttpOnly signés en base PostgreSQL, chaque route API vérifie vos permissions côté serveur (anti-IDOR), et les pièces jointes privées ne sont jamais exposées publiquement.",
  },
  {
    q: "Puis-je exporter mes projets et tâches à tout moment ?",
    a: "Oui. Depuis la page Paramètres, vous pouvez exporter vos projets, tâches, événements et objectifs au format JSON structuré ou CSV compatible tableur.",
  },
  {
    q: "NEXORA propose-t-il un vrai mode clair en plus du thème sombre ?",
    a: "Oui. Le thème sombre nocturne est activé par défaut pour le confort visuel, mais vous pouvez basculer en thème clair ou suivre le thème de votre système en un clic.",
  },
];

export function LandingSections() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  return (
    <>
      {/* 1. Fonctionnalités */}
      <section id="fonctionnalites" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="violet">Plateforme unifiée</Badge>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Tout votre flux de travail, sans dispersion
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            NEXORA réunit la clarté d&apos;un gestionnaire de tâches et la rigueur d&apos;un espace
            de travail collaboratif.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="nexora-card rounded-2xl p-6 hover:border-[#7C3AED]/40 transition-all"
              >
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${feat.accent}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feat.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 2. Démonstration interactive */}
      <section id="demo" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <InteractiveDemo />
      </section>

      {/* 3, 4, 5, 6. Piliers détaillés (Projets, Calendrier, Statistiques, Collaboration) */}
      <section
        id="comment-ca-marche"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="blue">01 · Gestion des projets</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">
              Passez de l&apos;idée au suivi concret en quelques clics
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Démarrez avec un projet vierge ou un modèle prêt à l&apos;emploi (Projet scolaire,
              Développement logiciel, Gestion d&apos;entreprise, Organisation personnelle). Suivez
              la progression automatique calculée à partir des tâches terminées.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-foreground">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#22C55E]" /> Vues Grille, Liste et Kanban
                persistantes
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#22C55E]" /> Archivage, restauration, favoris et
                historique d&apos;activité
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#22C55E]" /> Pièces jointes privées et sous-tâches
                ordonnées
              </li>
            </ul>
          </div>

          <div className="nexora-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Exemple de carte projet
              </span>
              <Badge variant="cyan">75 % terminé</Badge>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-secondary-surface p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Lancement Application SaaS</h4>
                  <p className="text-xs text-muted-foreground">Modèle Développement logiciel</p>
                </div>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-elevated overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#3B82F6] to-[#22D3EE]" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 nexora-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Aperçu calendrier & statistiques (exemple)
              </span>
              <Badge variant="violet">Europe/Paris</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border-subtle bg-secondary-surface p-4">
                <Calendar className="h-5 w-5 text-[#22D3EE]" />
                <p className="mt-3 text-sm font-semibold text-foreground">4 vues calendrier</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mois, Semaine, Jour et Agenda filtrables par projet.
                </p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-secondary-surface p-4">
                <BarChart3 className="h-5 w-5 text-[#22C55E]" />
                <p className="mt-3 text-sm font-semibold text-foreground">Indicateurs réels</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Taux de complétion, respect des délais et vélocité hebdomadaire.
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Badge variant="cyan">02 · Calendrier, Analytique & Équipe</Badge>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">
              Anticipez vos échéances et mesurez chaque progrès
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Visualisez vos tâches datées et événements récurrents au même endroit, invitez vos
              collaborateurs avec des rôles précis et suivez vos indicateurs de productivité sans
              feuilles de calcul manuelles.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Sécurité et confidentialité */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-border-strong bg-gradient-to-br from-[#111827] via-[#171F30] to-[#0B1020] p-8 sm:p-12 text-white">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#22D3EE]/15 px-3 py-1 text-xs font-medium text-[#22D3EE] border border-[#22D3EE]/30">
              <ShieldCheck className="h-4 w-4" /> Conception orientée cybersécurité
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold">
              Sécurité et confidentialité intégrées dès l&apos;architecture
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Chaque opération est validée côté serveur avec Zod, protégée contre les attaques CSRF,
              IDOR et injections, et isolée par espace de travail.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Hachage Argon2id",
                desc: "Mots de passe protégés avec Argon2id et limitation contre la force brute.",
              },
              {
                title: "Sessions HttpOnly & RBAC",
                desc: "Jetons de session hachés en base, révocation des sessions et contrôle d'accès par ressource.",
              },
              {
                title: "En-têtes & Stockage privé",
                desc: "CSP stricte, validation binaire des fichiers et téléchargement autorisé uniquement.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <Lock className="h-5 w-5 text-[#22D3EE]" />
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Tarification */}
      <section id="tarifs" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="violet">Tarification transparente</Badge>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-foreground">
            Commencez gratuitement, évoluez selon vos besoins
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Grille indicative de démonstration SaaS — toutes les fonctionnalités principales sont
            immédiatement testables dès l&apos;inscription.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-7 flex flex-col justify-between transition-all ${
                tier.highlight
                  ? "border-2 border-[#7C3AED] bg-secondary-surface shadow-2xl"
                  : "nexora-card"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                  {tier.highlight ? <Badge variant="violet">Populaire</Badge> : null}
                </div>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-xs text-muted-foreground">{tier.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.subtitle}</p>
                <ul className="mt-6 space-y-2.5 text-sm text-foreground">
                  {tier.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-[#22C55E] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href={tier.href} className="mt-8 block">
                <Button variant={tier.highlight ? "primary" : "secondary"} className="w-full">
                  {tier.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 9. FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <Badge variant="cyan">Questions fréquentes</Badge>
          <h2 className="mt-3 text-3xl font-bold text-foreground">Tout savoir sur NEXORA</h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={item.q} className="nexora-card rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-semibold text-foreground cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground border-t border-border-subtle pt-3">
                    {item.a}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. CTA Final */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-[#7C3AED]/40 bg-gradient-to-r from-[#7C3AED]/20 via-[#3B82F6]/15 to-[#22D3EE]/15 p-8 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Prêt à structurer vos projets en moins de trois minutes ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Créez votre espace de travail NEXORA gratuitement et prenez le contrôle de vos tâches,
            échéances et objectifs dès aujourd&apos;hui.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Link href="/inscription">
              <Button size="lg">
                Commencer gratuitement <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/connexion">
              <Button variant="secondary" size="lg">
                Se connecter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Footer complet */}
      <footer className="border-t border-border-subtle bg-secondary-surface/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <NexoraLogo />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Espace de travail intelligent pour centraliser projets, tâches, calendrier,
                objectifs et collaboration en équipe.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Plateforme</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="#fonctionnalites" className="hover:text-foreground">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#demo" className="hover:text-foreground">
                    Démonstration interactive
                  </a>
                </li>
                <li>
                  <a href="#tarifs" className="hover:text-foreground">
                    Tarifs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Accès</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/connexion" className="hover:text-foreground">
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link href="/inscription" className="hover:text-foreground">
                    Créer un compte
                  </Link>
                </li>
                <li>
                  <Link href="/mot-de-passe-oublie" className="hover:text-foreground">
                    Réinitialiser le mot de passe
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Transparence</h4>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Les aperçus de la page d&apos;accueil sont clairement présentés à titre de
                démonstration. Une fois connecté, toutes les données sont persistées dans
                PostgreSQL.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} NEXORA. Tous droits réservés.</p>
            <p>Conçu avec Next.js, TypeScript, Tailwind CSS et PostgreSQL.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
