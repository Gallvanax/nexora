function cleanEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

export const env = {
  get databaseUrl(): string {
    return cleanEnv(process.env.DATABASE_URL);
  },
  get authSecret(): string {
    const secret = cleanEnv(process.env.AUTH_SECRET);
    if (!secret && process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET doit être configuré en production.");
    }
    return secret || "nexora-dev-only-secret-change-in-production-32bytes";
  },
  get appUrl(): string {
    return cleanEnv(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get googleClientId(): string {
    return cleanEnv(process.env.GOOGLE_CLIENT_ID);
  },
  get googleClientSecret(): string {
    return cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  },
  get smtpHost(): string {
    return cleanEnv(process.env.SMTP_HOST);
  },
  get smtpPort(): number {
    const raw = Number(cleanEnv(process.env.SMTP_PORT) || "587");
    return Number.isFinite(raw) && raw > 0 ? raw : 587;
  },
  get smtpSecure(): boolean {
    return cleanEnv(process.env.SMTP_SECURE).toLowerCase() === "true";
  },
  get smtpUser(): string {
    return cleanEnv(process.env.SMTP_USER);
  },
  get smtpPass(): string {
    return cleanEnv(process.env.SMTP_PASS);
  },
  get smtpFrom(): string {
    return cleanEnv(process.env.SMTP_FROM) || "NEXORA <noreply@nexora.local>";
  },
  get s3Endpoint(): string {
    return cleanEnv(process.env.S3_ENDPOINT);
  },
  get s3Region(): string {
    return cleanEnv(process.env.S3_REGION) || "auto";
  },
  get s3Bucket(): string {
    return cleanEnv(process.env.S3_BUCKET);
  },
  get s3AccessKeyId(): string {
    return cleanEnv(process.env.S3_ACCESS_KEY_ID);
  },
  get s3SecretAccessKey(): string {
    return cleanEnv(process.env.S3_SECRET_ACCESS_KEY);
  },
  get aiProviderApiKey(): string {
    return cleanEnv(process.env.AI_PROVIDER_API_KEY);
  },
};

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

export function isS3Configured(): boolean {
  return Boolean(env.s3Bucket && env.s3AccessKeyId && env.s3SecretAccessKey);
}

export function isAiConfigured(): boolean {
  return Boolean(env.aiProviderApiKey);
}
