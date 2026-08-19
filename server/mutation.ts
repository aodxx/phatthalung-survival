import { recordAuditEvent, type AuditEvent } from "./audit";

type MutationOptions<T> = {
  event: AuditEvent;
  mutation: () => Promise<T>;
  audit?: (event: AuditEvent) => Promise<void>;
};

export type TransactionBoundary = <T>(work: () => Promise<T>) => Promise<T>;

/**
 * External-side-effect helper. The mutation is completed before its success
 * audit, but callers cannot claim database atomicity through this function.
 * Use runTransactionalAuditedMutation for database work.
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

/**
 * Database-only mutation boundary. The caller supplies a real transaction
 * callback (for example a PostgreSQL RPC or a database transaction client),
 * so a mutation and its success audit commit or roll back together.
 */
export async function runTransactionalAuditedMutation<T>({
  event,
  mutation,
  audit = recordAuditEvent,
  transaction,
}: MutationOptions<T> & { transaction: TransactionBoundary }): Promise<T> {
  return transaction(async () => {
    const result = await mutation();
    await audit(event);
    return result;
  });
}
