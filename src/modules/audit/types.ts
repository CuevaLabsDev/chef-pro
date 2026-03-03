export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateAuditEventInput {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}
