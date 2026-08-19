import { assertSupabaseConfigured } from "./supabase";

export type AuditEvent = {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  if (!event.actorUserId.trim())
    throw new Error("Audit actorUserId is required");
  if (!event.action.trim()) throw new Error("Audit action is required");
  if (!event.entityType.trim()) throw new Error("Audit entityType is required");
  if (!event.entityId.trim()) throw new Error("Audit entityId is required");
  if (Number.isNaN(event.occurredAt.getTime()))
    throw new Error("Audit occurredAt is invalid");

  const supabase = assertSupabaseConfigured();
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: event.actorUserId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    created_at: event.occurredAt.toISOString(),
    reason: event.reason ?? null,
    metadata: event.metadata ?? {},
  });

  if (error) throw new Error(`Audit log write failed: ${error.message}`);
}
