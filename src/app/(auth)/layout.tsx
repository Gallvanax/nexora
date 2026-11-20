import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NexoraLogo } from "@/components/shared/nexora-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground nexora-grid-bg">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border-subtle nexora-glass">
        <Link href="/" aria-label="Retour à l'accueil">
          <NexoraLogo />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au site
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
