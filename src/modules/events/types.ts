export type DomainEventType =
  | "session_created"
  | "session_submitted"
  | "session_edited_post_submit"
  | "session_reviewed"
  | "session_locked"
  | "session_unlocked"
  | "deadline_missed"
  | "item_photo_uploaded"
  | "config_updated";

export interface DomainEvent<T = unknown> {
  id: string;
  type: DomainEventType;
  timestamp: Date;
  actorId: string;
  entityId: string;
  entityType: string;
  payload: T;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

export interface EventSubscription {
  eventType: DomainEventType;
  handler: EventHandler;
  module: string;
}
