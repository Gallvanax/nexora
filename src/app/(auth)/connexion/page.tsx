"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/tableau-de-bord";
  const urlError = searchParams.get("error");

  const [serverError, setServerError] = React.useState<string | null>(
    urlError ? "La connexion externe n'a pas pu aboutir. Veuillez réessayer." : null
  );
  const [googleEnabled, setGoogleEnabled] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(Boolean(d.googleConfigured)))
      .catch(() => undefined);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Connexion impossible.");
        return;
      }

      toast.success(`Bon retour, ${data.user.name} !`);
      const safeNext = nextPath.startsWith("/") ? nextPath : "/tableau-de-bord";
      router.push(safeNext);
      router.refresh();
    } catch {
      setServerError("Erreur réseau. Vérifiez votre connexion.");
    }
  };

  return (
    <Card className="p-1 sm:p-2">
      <CardHeader>
        <CardTitle className="text-2xl">Connexion à NEXORA</CardTitle>
        <CardDescription>
          Accédez à vos projets, tâches et espaces de travail collaboratifs.
        </CardDescription>
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
            <label htmlFor="login-email" className="text-sm font-medium text-foreground">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                className="pl-10"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </div>
            {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                Mot de passe
              </label>
              <Link href="/mot-de-passe-oublie" className="text-xs text-[#22D3EE] hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="pl-10"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </div>
            {errors.password ? (
              <p className="text-xs text-danger">{errors.password.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Se connecter <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {googleEnabled ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou</span>
              </div>
            </div>
            <a href="/api/auth/google" className="block">
              <Button type="button" variant="secondary" className="w-full" size="md">
                Continuer avec Google
              </Button>
            </a>
          </>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-[#22D3EE] hover:underline">
            Créer un compte gratuitement
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ConnexionPage() {
  return (
    <React.Suspense fallback={<div className="h-96 rounded-2xl nexora-card animate-pulse" />}>
      <LoginFormInner />
    </React.Suspense>
  );
}
