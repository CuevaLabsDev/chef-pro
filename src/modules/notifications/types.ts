export type NotificationChannel = "email" | "google_chat" | "in_app";
export type NotificationStatus = "pending" | "sent" | "failed";

export interface NotificationEvent {
  id: string;
  type: string;
  recipientId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationStatus;
  relatedEntityType?: string;
  relatedEntityId?: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface SendNotificationInput {
  type: string;
  recipientId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}
