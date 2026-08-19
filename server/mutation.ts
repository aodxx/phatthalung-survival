import { recordAuditEvent, type AuditEvent } from "./audit";

type MutationOptions<T> = {
  event: AuditEvent;
  mutation: () => Promise<T>;
  audit?: (event: AuditEvent) => Promise<void>;
};

/**
 * The success audit is deliberately written only after the business mutation
 * resolves. Public Intake uses the PostgreSQL RPC instead, where mutation and
 * audit are one real database transaction. Callers requiring cross-table
 * atomicity must use a transactional database boundary rather than this REST
 * helper.
 */
export async function runAuditedMutation<T>({
  event,
  mutation,
  audit = recordAuditEvent,
}: MutationOptions<T>): Promise<T> {
  const result = await mutation();
  await audit(event);
  return result;
}
