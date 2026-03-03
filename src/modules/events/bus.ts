import { v4 as uuidv4 } from "uuid";
import type { DomainEvent, DomainEventType, EventHandler, EventSubscription } from "./types";

class DomainEventBus {
  private subscriptions: EventSubscription[] = [];

  subscribe(eventType: DomainEventType, handler: EventHandler, module: string): void {
    this.subscriptions.push({ eventType, handler, module });
  }

  async publish<T>(
    type: DomainEventType,
    actorId: string,
    entityId: string,
    entityType: string,
    payload: T,
    metadata?: Record<string, unknown>
  ): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      id: uuidv4(),
      type,
      timestamp: new Date(),
      actorId,
      entityId,
      entityType,
      payload,
      metadata,
    };

    const handlers = this.subscriptions.filter((s) => s.eventType === type);

    await Promise.allSettled(
      handlers.map((s) =>
        s.handler(event as DomainEvent<unknown>).catch((err) => {
          console.error(`[EventBus] Handler in ${s.module} failed for ${type}:`, err);
        })
      )
    );

    return event;
  }

  getSubscriptions(): ReadonlyArray<EventSubscription> {
    return this.subscriptions;
  }
}

export const eventBus = new DomainEventBus();
