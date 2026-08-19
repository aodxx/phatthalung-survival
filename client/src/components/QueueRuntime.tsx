import { useEffect } from "react";
import { drainQueue } from "@/lib/offlineQueue";
import { trpc } from "@/lib/trpc";

export default function QueueRuntime() {
  const { mutateAsync } = trpc.intake.submit.useMutation();

  useEffect(() => {
    const flush = async () => {
      await drainQueue(async item => {
        const response = await mutateAsync(item);
        return {
          acknowledged:
            response.status === "RECEIVED" ||
            response.status === "ALREADY_RECEIVED",
          caseCode: response.caseCode,
        };
      });
    };

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [mutateAsync]);

  return null;
}
