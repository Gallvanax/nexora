"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FormValues = z.infer<typeof forgotPasswordSchema>;

export default function MotDePasseOubliePage() {
  const [submittedMsg, setSubmittedMsg] = React.useState<string | null>(null);
  const [devUrl, setDevUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible d'envoyer la demande.");
        return;
      }
      setSubmittedMsg(data.message);
      if (data.devPreviewUrl) setDevUrl(data.devPreviewUrl);
    } catch {
      setError("Erreur réseau.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submittedMsg ? (
          <div className="space-y-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Demande enregistrée
            </div>
            <p className="text-muted-foreground">{submittedMsg}</p>
            {devUrl ? (
              <a
                href={devUrl}
                className="block rounded-lg border border-[#22D3EE]/30 bg-secondary-surface p-2.5 font-mono text-xs text-[#22D3EE] break-all hover:underline"
              >
                Lien dev : {devUrl}
              </a>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="space-y-1.5">
              <label htmlFor="fp-email" className="text-sm font-medium text-foreground">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fp-email"
                  type="email"
                  placeholder="vous@exemple.com"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
            </div>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Envoyer le lien de réinitialisation
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/connexion" className="text-[#22D3EE] hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
