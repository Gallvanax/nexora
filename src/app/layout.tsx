import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AppProviders } from "@/components/shared/providers";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "NEXORA — Organisez vos projets. Libérez votre potentiel.",
    template: "%s | NEXORA",
  },
  description:
    "Un espace de travail intelligent pour centraliser projets, tâches, échéances, calendrier, objectifs, documents et collaboration d'équipe.",
  openGraph: {
    title: "NEXORA — Plateforme SaaS de gestion de projets et productivité",
    description:
      "Transformez vos idées en résultats : Kanban temps réel, calendrier intelligent, analytique et espaces collaboratifs sécurisés.",
    type: "website",
    locale: "fr_FR",
    siteName: "NEXORA",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXORA — Organisez vos projets. Libérez votre potentiel.",
    description:
      "Un espace de travail intelligent pour transformer vos idées en résultats, sans perdre de temps.",
  },
  alternates: {
    canonical: "/",
  },
};

const themeInitScript = `
(function(){
  try {
    var pref = localStorage.getItem('nexora_theme') || 'DARK';
    var isDark = pref === 'DARK' || (pref === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
