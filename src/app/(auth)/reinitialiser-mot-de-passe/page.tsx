"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { passwordPolicySchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    if (!token) {
      setError("Jeton de réinitialisation manquant dans l'URL.");
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de réinitialiser le mot de passe.");
        return;
      }
      toast.success("Mot de passe mis à jour ! Vous pouvez vous connecter.");
      router.push("/connexion");
    } catch {
      setError("Erreur réseau.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>
          Définissez un mot de passe robuste pour sécuriser votre compte NEXORA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="rp-pass" className="text-sm font-medium">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="rp-pass" type="password" className="pl-10" {...register("password")} />
            </div>
            {errors.password ? (
              <p className="text-xs text-danger">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rp-confirm" className="text-sm font-medium">
              Confirmer le mot de passe
            </label>
            <Input id="rp-confirm" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword ? (
              <p className="text-xs text-danger">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Enregistrer le mot de passe
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/connexion" className="text-[#22D3EE] hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <React.Suspense fallback={<div className="h-72 rounded-2xl nexora-card animate-pulse" />}>
      <ResetFormInner />
    </React.Suspense>
  );
}
