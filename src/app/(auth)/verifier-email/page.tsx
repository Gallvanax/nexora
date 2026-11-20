"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = React.useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [message, setMessage] = React.useState(token ? "" : "Aucun jeton de vérification fourni.");

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lien invalide ou expiré.");
        if (!cancelled) {
          setStatus("success");
          setMessage("Votre adresse e-mail est maintenant vérifiée.");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Erreur de vérification.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérification de l&apos;e-mail</CardTitle>
        <CardDescription>Validation sécurisée de votre adresse de contact.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" ? (
          <p className="text-sm text-muted-foreground">Vérification en cours…</p>
        ) : null}
        {status === "success" ? (
          <div className="flex items-center gap-2.5 text-success text-sm font-medium">
            <CheckCircle2 className="h-5 w-5" />
            <span>{message}</span>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="flex items-center gap-2.5 text-danger text-sm font-medium">
            <XCircle className="h-5 w-5" />
            <span>{message}</span>
          </div>
        ) : null}
        <Link href="/tableau-de-bord" className="block pt-2">
          <Button className="w-full">Continuer vers NEXORA</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifierEmailPage() {
  return (
    <React.Suspense fallback={<div className="h-56 rounded-2xl nexora-card animate-pulse" />}>
      <VerifyEmailInner />
    </React.Suspense>
  );
}
