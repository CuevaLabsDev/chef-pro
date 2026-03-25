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
          subject: "Tasting updated after it was sent in",
          body: `${actor?.name ?? "A chef"} made changes to a tasting that was already submitted.`,
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
    "packet_amendment_requested",
    async (event: DomainEvent) => {
      const actor = await prisma.user.findUnique({ where: { id: event.actorId } });
      const payload = event.payload as {
        locationId?: string;
        locationName?: string;
        meal?: string;
        description?: string;
      };

      await createAuditEvent({
        entityType: "PacketAmendment",
        entityId: event.entityId,
        action: "amendment_requested",
        actorId: event.actorId,
        actorName: actor?.name ?? "Unknown",
        metadata: payload,
      });

      const recipients = await getOpsAndFteUsers();
      for (const recipient of recipients) {
        await sendNotification({
          type: "packet_amendment_requested",
          recipientId: recipient.id,
          channel: "in_app",
          subject: `Sign change needed — ${payload.locationName ?? "a cafe"} ${payload.meal ?? ""}`,
          body: `${actor?.name ?? "Someone"} needs a sign update at ${payload.locationName ?? "a cafe"} (${payload.meal ?? ""}): ${payload.description ?? ""}`,
          relatedEntityType: "PacketAmendment",
          relatedEntityId: event.entityId,
        });
      }
    },
    "notifications"
  );

  eventBus.subscribe(
    "backup_sign_requested",
    async (event: DomainEvent) => {
      const actor = await prisma.user.findUnique({ where: { id: event.actorId } });
      const payload = event.payload as {
        locationName?: string;
        meal?: string;
        description?: string;
      };

      await createAuditEvent({
        entityType: "PacketAmendment",
        entityId: event.entityId,
        action: "backup_sign_requested",
        actorId: event.actorId,
        actorName: actor?.name ?? "Unknown",
        metadata: payload,
      });

      const recipients = await getOpsAndFteUsers();
      for (const recipient of recipients) {
        await sendNotification({
          type: "backup_sign_requested",
          recipientId: recipient.id,
          channel: "in_app",
          subject: `Backup sign needed NOW — ${payload.locationName ?? "a cafe"}`,
          body: `${actor?.name ?? "Someone"} needs a backup sign at ${payload.locationName ?? "a cafe"} (${payload.meal ?? ""}): ${payload.description ?? ""}`,
          relatedEntityType: "PacketAmendment",
          relatedEntityId: event.entityId,
        });
      }
    },
    "notifications"
  );

  eventBus.subscribe(
    "tasting_score_notable",
    async (event: DomainEvent) => {
      const payload = event.payload as {
        level?: string;
        dishName?: string;
        avgRating?: number;
        locationName?: string;
        period?: string;
      };
      const label = payload.level === "low" ? "Needs attention" : "Great dish";
      const recipients = await getOpsAndFteUsers();
      for (const recipient of recipients) {
        await sendNotification({
          type: "tasting_score_notable",
          recipientId: recipient.id,
          channel: "in_app",
          subject: `${label} — ${payload.dishName ?? "a dish"}`,
          body: `${payload.locationName ?? ""} ${payload.period ?? ""}: ${payload.dishName ?? "A dish"} scored ${payload.avgRating ?? "?"} out of 5`,
          relatedEntityType: "TastingItem",
          relatedEntityId: event.entityId,
        });
      }
    },
    "notifications"
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
          subject: "Tasting not submitted on time",
          body: `The tasting for ${payload.locationName ?? "a cafe"} (${payload.periodName ?? "a meal"}) wasn't sent in by the deadline.`,
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
