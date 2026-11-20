"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CheckCheck, Settings, Trash2 } from "lucide-react";
import { formatRelativeTimeFr } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialNotifications);
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const markRead = async (id: string, isRead: boolean) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isRead }),
    });
    router.refresh();
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    toast.success("Toutes les notifications ont été marquées comme lues.");
    router.refresh();
  };

  const removeOne = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  };

  const visible = unreadOnly ? items.filter((n) => !n.isRead) : items;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez les tâches attribuées, commentaires, invitations et mises à jour projets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={unreadOnly ? "primary" : "secondary"}
            size="sm"
            onClick={() => setUnreadOnly((v) => !v)}
          >
            Non lues uniquement
          </Button>
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </Button>
          <Link href="/parametres">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" /> Préférences
            </Button>
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous êtes à jour sur toute votre activité."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((n) => (
            <Card
              key={n.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !n.isRead ? "border-[#7C3AED]/40 bg-[#7C3AED]/5" : ""
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!n.isRead ? <span className="h-2 w-2 rounded-full bg-[#22D3EE]" /> : null}
                  <p className="font-semibold text-sm text-foreground">{n.title}</p>
                  <Badge>{n.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatRelativeTimeFr(n.createdAt)}</span>
                  {n.link ? (
                    <Link href={n.link} className="text-[#22D3EE] hover:underline">
                      Ouvrir la ressource
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => markRead(n.id, !n.isRead)}>
                  {n.isRead ? "Marquer non lu" : "Marquer lu"}
                </Button>
                <button
                  type="button"
                  onClick={() => removeOne(n.id)}
                  aria-label="Supprimer la notification"
                  className="p-1.5 text-muted-foreground hover:text-danger cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
