import { NextResponse } from "next/server";
import { getUserNotifications, getUnreadNotificationCount } from "@/modules/notifications/service";
import { requireAuth } from "@/modules/identity-access/middleware";
import { hasPermission } from "@/modules/identity-access/service";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error!;
  if (!hasPermission(user, "notifications.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
