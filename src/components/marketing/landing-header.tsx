"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NexoraLogo } from "@/components/shared/nexora-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Comment ça marche", href: "#comment-ca-marche" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export function LandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle nexora-glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="focus-visible:rounded-lg" aria-label="Accueil NEXORA">
          <NexoraLogo />
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Navigation principale">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href="/tableau-de-bord">
              <Button size="md">Accéder à mon espace</Button>
            </Link>
          ) : (
            <>
              <Link href="/connexion">
                <Button variant="ghost" size="md">
                  Connexion
                </Button>
              </Link>
              <Link href="/inscription">
                <Button size="md">Commencer gratuitement</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="lg:hidden border-t border-border-subtle bg-secondary-surface px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2" aria-label="Navigation mobile">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-elevated"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-border-subtle flex flex-col gap-2">
            {isAuthenticated ? (
              <Link href="/tableau-de-bord" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Accéder à mon espace</Button>
              </Link>
            ) : (
              <>
                <Link href="/connexion" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Connexion
                  </Button>
                </Link>
                <Link href="/inscription" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">Commencer gratuitement</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
