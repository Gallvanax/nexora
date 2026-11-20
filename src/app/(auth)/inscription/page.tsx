"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Building2, Lock, Mail, User } from "lucide-react";
import { registerSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RegisterValues = z.infer<typeof registerSchema>;

export default function InscriptionPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [verifyLink, setVerifyLink] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Impossible de créer le compte.");
        return;
      }

      toast.success("Compte créé ! Bienvenue sur NEXORA.");

      if (data.emailVerification?.previewUrl) {
        setVerifyLink(data.emailVerification.previewUrl);
      } else {
        router.push("/tableau-de-bord");
        router.refresh();
      }
    } catch {
      setServerError("Erreur réseau. Réessayez.");
    }
  };

  if (verifyLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compte créé avec succès</CardTitle>
          <CardDescription>
            Votre espace de travail est prêt. En mode développement local sans serveur SMTP, vous
            pouvez valider votre adresse e-mail via le lien ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            href={verifyLink}
            className="block rounded-xl border border-[#22D3EE]/40 bg-[#22D3EE]/10 p-3 text-xs font-mono text-[#22D3EE] break-all hover:underline"
          >
            {verifyLink}
          </a>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              router.push("/tableau-de-bord");
              router.refresh();
            }}
          >
            Accéder au tableau de bord <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-1 sm:p-2">
      <CardHeader>
        <CardTitle className="text-2xl">Créer un compte NEXORA</CardTitle>
        <CardDescription>Démarrez votre premier projet en moins de trois minutes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {serverError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="text-sm font-medium text-foreground">
              Nom complet
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-name"
                placeholder="Camille Laurent"
                className="pl-10"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </div>
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-sm font-medium text-foreground">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="vous@entreprise.fr"
                className="pl-10"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </div>
            {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-workspace" className="text-sm font-medium text-foreground">
              Nom de votre espace (optionnel)
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-workspace"
                placeholder="Mon Studio / Équipe Produit"
                className="pl-10"
                {...register("workspaceName")}
              />
            </div>
            {errors.workspaceName ? (
              <p className="text-xs text-danger">{errors.workspaceName.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 caractères, 1 majuscule, 1 chiffre"
                className="pl-10"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </div>
            {errors.password ? (
              <p className="text-xs text-danger">{errors.password.message}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Au moins 8 caractères dont 1 majuscule, 1 minuscule et 1 chiffre.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Créer mon espace <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-semibold text-[#22D3EE] hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
