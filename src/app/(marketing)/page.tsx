import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Play, ShieldCheck } from "lucide-react";
import { getCurrentSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandingHeader } from "@/components/marketing/landing-header";
import { HeroDashboardPreview } from "@/components/marketing/hero-dashboard-preview";
import { LandingSections } from "@/components/marketing/landing-sections";

async function AuthAwareHeader() {
  const session = await getCurrentSession();
  return <LandingHeader isAuthenticated={Boolean(session)} />;
}

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NEXORA",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Application SaaS de gestion de projets et de productivité pour centraliser projets, tâches, échéances, calendrier et collaboration.",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Suspense fallback={<LandingHeader isAuthenticated={false} />}>
        <AuthAwareHeader />
      </Suspense>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden nexora-grid-bg border-b border-border-subtle">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[46rem] rounded-full bg-gradient-to-r from-[#7C3AED]/20 via-[#3B82F6]/20 to-[#22D3EE]/15 blur-3xl"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <Badge variant="cyan">
                  <ShieldCheck className="h-3.5 w-3.5" /> Espace de travail nouvelle génération
                </Badge>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
                  Organisez vos projets.{" "}
                  <span className="bg-gradient-to-r from-[#7C3AED] via-[#3B82F6] to-[#22D3EE] bg-clip-text text-transparent">
                    Libérez votre potentiel.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Un espace de travail intelligent pour transformer vos idées en résultats, sans
                  perdre de temps.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link href="/inscription">
                    <Button size="lg">
                      Commencer gratuitement <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#demo">
                    <Button variant="secondary" size="lg">
                      <Play className="h-4 w-4 text-[#22D3EE]" /> Découvrir la plateforme
                    </Button>
                  </a>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                  <span>✓ Premier projet prêt en moins de 3 min</span>
                  <span>✓ Thème sombre & clair natifs</span>
                  <span>✓ Export CSV / JSON inclus</span>
                </div>
              </div>

              <div className="lg:col-span-6">
                <HeroDashboardPreview />
              </div>
            </div>
          </div>
        </section>

        <LandingSections />
      </main>
    </div>
  );
}
