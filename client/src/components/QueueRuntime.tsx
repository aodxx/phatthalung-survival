import { useEffect } from "react";
import { drainQueue } from "@/lib/offlineQueue";
import { trpc } from "@/lib/trpc";
import {
  isSupabaseProductionRuntime,
  submitPublicIntakeProduction,
} from "@/lib/publicApi";

export default function QueueRuntime() {
  const { mutateAsync } = trpc.intake.submit.useMutation();

  const sendItem = async (item: Parameters<typeof mutateAsync>[0]) =>
    isSupabaseProductionRuntime()
      ? submitPublicIntakeProduction(item)
      : mutateAsync(item);

  useEffect(() => {
    const flush = async () => {
      const results = await drainQueue(async item => {
        const response = await sendItem(item);
        return {
          acknowledged:
            response.status === "RECEIVED" ||
            response.status === "ALREADY_RECEIVED",
          caseCode: response.caseCode,
          trackingToken: response.trackingToken,
          receivedAt: response.receivedAt,
        };
      });
      window.dispatchEvent(
        new CustomEvent("citizen-queue-updated", { detail: results })
      );
    };

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [mutateAsync]);

  return null;
}
