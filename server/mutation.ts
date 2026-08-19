import { recordAuditEvent, type AuditEvent } from "./audit";

type MutationOptions<T> = {
  event: AuditEvent;
  mutation: () => Promise<T>;
  audit?: (event: AuditEvent) => Promise<void>;
};

export async function runAuditedMutation<T>({
  event,
  mutation,
  audit = recordAuditEvent,
}: MutationOptions<T>): Promise<T> {
  await audit(event);
  return mutation();
}
