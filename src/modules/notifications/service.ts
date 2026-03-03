import { prisma } from "@/lib/db";
import type { SendNotificationInput } from "./types";

export async function sendNotification(input: SendNotificationInput) {
  const notification = await prisma.notificationEvent.create({
    data: {
      type: input.type,
      recipientId: input.recipientId,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      status: "pending",
    },
  });

  // In-app notifications are immediately "sent"
  if (input.channel === "in_app") {
    await prisma.notificationEvent.update({
      where: { id: notification.id },
      data: { status: "sent", sentAt: new Date() },
    });
  }

  return notification;
}

export async function getUserNotifications(userId: string, limit = 20) {
  return prisma.notificationEvent.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationSent(id: string) {
  return prisma.notificationEvent.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notificationEvent.count({
    where: { recipientId: userId, status: "pending" },
  });
}
