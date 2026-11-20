import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.appUrl.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/connexion", "/inscription"],
        disallow: [
          "/tableau-de-bord",
          "/projets",
          "/taches",
          "/calendrier",
          "/objectifs",
          "/statistiques",
          "/equipe",
          "/notifications",
          "/parametres",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
