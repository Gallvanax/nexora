import { prisma } from "@/lib/db/prisma";
import { requirePageUser } from "@/lib/auth/session";
import { NotificationsClient } from "@/components/team/notifications-client";

export default async function NotificationsPage() {
  const ctx = await requirePageUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <NotificationsClient
      initialNotifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
