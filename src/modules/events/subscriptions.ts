import { eventBus } from "./bus";
import { createAuditEvent } from "@/modules/audit/service";
import { sendNotification } from "@/modules/notifications/service";
import { getOpsAndFteUsers } from "@/modules/identity-access/service";
import { prisma } from "@/lib/db";
import type { DomainEvent } from "./types";

function registerSubscriptions() {
  eventBus.subscribe(
    "session_submitted",
    async (event: DomainEvent) => {
      const actor = await prisma.user.findUnique({ where: { id: event.actorId } });
      await createAuditEvent({
        entityType: "TastingSession",
        entityId: event.entityId,
        action: "submitted",
        actorId: event.actorId,
        actorName: actor?.name ?? "Unknown",
      });
    },
    "audit"
  );

  eventBus.subscribe(
    "session_edited_post_submit",
    async (event: DomainEvent) => {
      const actor = await prisma.user.findUnique({ where: { id: event.actorId } });
      await createAuditEvent({
        entityType: "TastingSession",
        entityId: event.entityId,
        action: "edited_post_submit",
        actorId: event.actorId,
        actorName: actor?.name ?? "Unknown",
        metadata: event.payload as Record<string, unknown>,
      });

      const recipients = await getOpsAndFteUsers();
      for (const recipient of recipients) {
        await sendNotification({
          type: "post_submit_edit",
          recipientId: recipient.id,
          channel: "in_app",
          subject: "Tasting session edited after submission",
          body: `${actor?.name ?? "A chef"} edited session ${event.entityId} after submission.`,
          relatedEntityType: "TastingSession",
          relatedEntityId: event.entityId,
        });
      }
    },
    "notifications"
  );

  eventBus.subscribe(
    "session_reviewed",
    async (event: DomainEvent) => {
      const actor = await prisma.user.findUnique({ where: { id: event.actorId } });
      await createAuditEvent({
        entityType: "TastingSession",
        entityId: event.entityId,
        action: "reviewed",
        actorId: event.actorId,
        actorName: actor?.name ?? "Unknown",
      });
    },
    "audit"
  );

  eventBus.subscribe(
    "session_locked",
    async (event: DomainEvent) => {
      const actor = await prisma.user.findUnique({ where: { id: event.actorId } });
      await createAuditEvent({
        entityType: "TastingSession",
        entityId: event.entityId,
        action: "locked",
        actorId: event.actorId,
        actorName: actor?.name ?? "Unknown",
      });
    },
    "audit"
  );

  eventBus.subscribe(
    "deadline_missed",
    async (event: DomainEvent) => {
      const recipients = await getOpsAndFteUsers();
      const payload = event.payload as { locationName?: string; periodName?: string };
      for (const recipient of recipients) {
        await sendNotification({
          type: "deadline_missed",
          recipientId: recipient.id,
          channel: "in_app",
          subject: "Tasting deadline missed",
          body: `Tasting for ${payload.locationName ?? "unknown location"} / ${payload.periodName ?? "unknown period"} was not submitted on time.`,
          relatedEntityType: "TastingSession",
          relatedEntityId: event.entityId,
        });
      }
    },
    "notifications"
  );
}

let initialized = false;
export function ensureSubscriptions() {
  if (!initialized) {
    registerSubscriptions();
    initialized = true;
  }
}
