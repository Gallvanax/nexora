# NEXORA — Plateforme SaaS de Gestion de Projets et Productivité

**NEXORA** est une application web SaaS complète développée avec Next.js (App Router), TypeScript strict, Tailwind CSS, Framer Motion, Recharts, Prisma ORM et PostgreSQL.

---

## 1. Architecture et choix techniques majeurs

```text
nexora/
├── prisma/
│   ├── schema.prisma          # Modèle relationnel PostgreSQL (19 tables + index)
│   └── seed.ts                # Jeu de données de démonstration clairement identifié
├── src/
│   ├── app/
│   │   ├── (marketing)/       # Landing page publique SEO-optimisée
│   │   ├── (auth)/            # Connexion, inscription, vérification e-mail, reset mot de passe
│   │   ├── (dashboard)/       # Espace applicatif authentifié (9 modules)
│   │   ├── api/               # Endpoints REST sécurisés (Zod + RBAC + CSRF + Rate Limit)
│   │   ├── layout.tsx         # Thème sombre/clair, polices Inter & Geist Mono
│   │   ├── robots.ts          # Indexation publique uniquement
│   │   └── sitemap.ts         # Plan du site SEO
│   ├── components/            # UI réutilisable, marketing, dashboard, Kanban, calendrier, équipe
│   ├── lib/
│   │   ├── auth/              # Argon2id (@node-rs/argon2), sessions DB HttpOnly, rate limiting
│   │   ├── db/                # Client Prisma singleton via @prisma/adapter-pg
│   │   ├── permissions/       # Matrice RBAC (OWNER > ADMIN > MEMBER > VIEWER) & anti-IDOR
│   │   └── validations/       # Schémas Zod partagés client/serveur
│   ├── services/              # E-mail SMTP, stockage privé/S3, analytique, modèles, connecteur IA
│   ├── tests/                 # Tests unitaires, intégration DB et E2E Playwright
│   └── proxy.ts               # Barrière réseau Next.js 16 (protection des routes privées)
├── .env.example               # Modèle de configuration sans secrets
├── .github/workflows/ci.yml   # Pipeline CI/CD automatisé
└── prisma.config.ts           # Configuration Prisma 7
```

### Justification des choix structurants
- **Sessions en base PostgreSQL + cookies HttpOnly** (`src/lib/auth/session.ts`) plutôt que des JWT stateless seuls : permet la révocation instantanée d'une session active depuis les paramètres, l'invalidation globale après réinitialisation du mot de passe et le suivi des appareils connectés.
- **`@node-rs/argon2` (Argon2id)** : hachage résistant aux attaques GPU/ASIC avec binaires N-API précompilés (zéro compilation C++ requise sous Windows/Linux).
- **Contrôle d'accès RBAC strict côté serveur** (`src/lib/permissions/rbac.ts`) : chaque route API et chaque Server Component vérifie l'appartenance à l'espace ou au projet et renvoie `404` aux non-membres pour prévenir toute énumération d'identifiants (anti-IDOR).
- **Stockage privé autorisé** (`src/services/storage.ts`) : validation MIME + signature binaire (*magic bytes*) + stockage hors dossier `public/`, servi exclusivement via `/api/attachments/[id]` après contrôle d'autorisation.

---

## 2. Prérequis et installation locale

### Prérequis
- Node.js 20+ (testé avec Node.js 26)
- PostgreSQL 15+ (ou serveur local rapide intégré via `npx prisma dev`)

### Installation pas à pas

1. **Installer les dépendances :**
   ```bash
   npm install
   ```

2. **Configurer l'environnement :**
   ```bash
   cp .env.example .env
   ```
   Renseignez `DATABASE_URL` et un `AUTH_SECRET` généré aléatoirement (`openssl rand -hex 32`).

3. **Démarrer PostgreSQL (option locale rapide via Prisma Postgres) :**
   ```bash
   npx prisma dev
   ```
   *(Copiez l'URL `postgres://...` affichée par `prisma dev` dans `DATABASE_URL` de votre `.env`, ou pointez vers votre instance PostgreSQL / Docker habituelle).*

4. **Générer le client Prisma et appliquer les migrations :**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
   *(Ou `npx prisma db push` en développement rapide).*

5. **Charger les données de démonstration (optionnel) :**
   ```bash
   npm run db:seed
   ```
   Compte de démonstration créé par le seed :
   - **E-mail :** `camille.demo@nexora.app`
   - **Mot de passe :** `NexoraDemo#2026`

6. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   Ouvrez [http://localhost:3000](http://localhost:3000).

---

## 3. Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement Next.js |
| `npm run build` | Build de production Next.js |
| `npm run start` | Démarrer l'application buildée |
| `npm run lint` | Vérification ESLint |
| `npm run typecheck` | Vérification TypeScript strict (`tsc --noEmit`) |
| `npm run format:check` | Contrôle Prettier |
| `npm run test:unit` | Exécuter les tests unitaires et d'intégration Vitest |
| `npm run test:e2e` | Exécuter les tests end-to-end Playwright |

---

## 4. Services externes optionnels

- **Google OAuth :** définissez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`. URI de redirection autorisée : `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`. Si absent, le bouton Google est automatiquement masqué.
- **E-mails transactionnels (SMTP) :** définissez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Si non configuré en développement local, les liens de vérification/réinitialisation sont renvoyés sous forme de lien de prévisualisation dev.
- **Stockage S3 :** définissez `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (et `S3_ENDPOINT` pour Cloudflare R2 / MinIO). Sans configuration S3, les fichiers sont stockés dans `./storage/uploads` (exclu de Git et inaccessible directement par URL statique).
- **Assistant IA :** l'interface `src/services/ai-assistant.ts` est prête pour recevoir un SDK LLM dès que `AI_PROVIDER_API_KEY` est renseigné. Aucun appel IA factice n'est simulé.

---

## 5. Sécurité, risques résiduels et déploiement en production

### Déploiement recommandé (Vercel / Docker / Node + PostgreSQL managé)
1. Provisionnez une base PostgreSQL managée (Neon, Supabase, RDS, Railway ou Render) avec connexions TLS activées.
2. Configurez toutes les variables d'environnement requises (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` en `https://`).
3. Exécutez `npx prisma migrate deploy` dans l'étape de release avant de démarrer `npm run start`.
4. Pour un déploiement multi-instance, configurez un stockage objet S3 privé (`S3_BUCKET`) car le stockage local `./storage/uploads` n'est pas partagé entre conteneurs éphémères.

### Vérifications requises en production & risques résiduels
- **TLS / HTTPS :** le drapeau `Secure` des cookies de session et `HSTS` reposent sur l'hébergement derrière HTTPS (`NODE_ENV=production`).
- **CSP :** `script-src` autorise `'unsafe-inline'` pour le script d'initialisation anti-FOUC du thème et l'hydratation Next.js ; pour un durcissement maximal, migrez vers des nonces dynamiques dans `src/proxy.ts`.
- **Anti-virus fichiers :** la validation vérifie l'extension, le type MIME et les octets magiques ; pour des environnements critiques, branchez un scanner antivirus (ex. ClamAV) avant sauvegarde.

---

## 6. Sauvegarde, restauration et dépannage

### Sauvegarde et restauration PostgreSQL
```bash
# Sauvegarde
pg_dump "$DATABASE_URL" --format=custom --file="backup-nexora-$(date +%Y%m%d).dump"

# Restauration
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup-nexora-YYYYMMDD.dump
```

### Dépannage rapide
- **`DATABASE_URL manquant` / connexion refusée :** vérifiez que `.env` existe et que PostgreSQL (ou `npx prisma dev`) est actif.
- **Erreur client Prisma obsolète :** relancez `npx prisma generate`.
- **Blocage temporaire après trop de tentatives de connexion :** attendez l'expiration de la fenêtre anti-force brute (15 min) ou purgez `RateLimitEntry` en base.
