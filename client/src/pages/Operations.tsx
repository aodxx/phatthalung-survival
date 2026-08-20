import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const route = (path: string) => `${base}${path}` || "/";

const priorityLabel: Record<string, string> = {
  P1: "วิกฤตสูงสุด",
  P2: "เร่งด่วน",
  P3: "สำคัญ",
  P4: "ติดตาม",
};

export default function Operations() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<
    "P1" | "P2" | "P3" | "P4" | undefined
  >();
  const [unassigned, setUnassigned] = useState(false);
  const [status, setStatus] = useState("");
  const [zoneId, setZoneId] = useState("");
  const input = useMemo(
    () => ({
      limit: 25,
      offset: 0,
      search: search.trim() || undefined,
      priority,
      unassigned,
      status: status ? [status] : undefined,
      zoneId: zoneId.trim() || undefined,
    }),
    [priority, search, status, unassigned, zoneId]
  );
  const queue = trpc.operations.queue.useQuery(input, {
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-slate-50 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Phatthalung Survival / Staff
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              คิวปฏิบัติการ
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              รายการคำร้องที่ server รับรองแล้ว เรียงตาม P1
              และเวลารอจากฐานข้อมูล
            </p>
          </div>
          <Link href={route("/")} className="shrink-0">
            <Button
              variant="outline"
              className="min-h-11 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> กลับ
            </Button>
          </Link>
        </header>

        <Card className="border-slate-700 bg-slate-900 text-slate-50">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="block text-sm font-semibold">
              ค้นหา Case ID หรือ source reference
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="min-h-11 border-slate-600 bg-slate-950 pl-9 text-slate-100"
                  placeholder="เช่น PS-..."
                />
              </div>
            </label>
            <label className="block text-sm font-semibold">
              ระดับความเร่งด่วน
              <select
                value={priority ?? ""}
                onChange={event =>
                  setPriority(
                    (event.target.value || undefined) as typeof priority
                  )
                }
                className="mt-2 min-h-11 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-slate-100 sm:w-40"
              >
                <option value="">ทั้งหมด</option>
                <option value="P1">P1 · วิกฤต</option>
                <option value="P2">P2 · เร่งด่วน</option>
                <option value="P3">P3 · สำคัญ</option>
                <option value="P4">P4 · ติดตาม</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              สถานะรับแจ้ง
              <select
                value={status}
                onChange={event => setStatus(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-slate-100 sm:w-44"
              >
                <option value="">ทั้งหมด</option>
                <option value="UNVERIFIED">ยังไม่ตรวจ</option>
                <option value="CONTACTED">ติดต่อแล้ว</option>
                <option value="CONFIRMED">ยืนยันแล้ว</option>
                <option value="NEEDS_RECHECK">ต้องตรวจซ้ำ</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Zone ID (staff scope)
              <Input
                value={zoneId}
                onChange={event => setZoneId(event.target.value)}
                className="mt-2 min-h-11 border-slate-600 bg-slate-950 text-slate-100"
                placeholder="UUID (ถ้าจำเป็น)"
              />
            </label>
            <Button
              type="button"
              onClick={() => setUnassigned(current => !current)}
              variant="outline"
              className={`min-h-11 border-slate-600 ${unassigned ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-slate-100"}`}
            >
              {unassigned ? "แสดงเฉพาะยังไม่ผูก Incident" : "กรองเคสยังไม่ผูก"}
            </Button>
          </CardContent>
        </Card>

        {queue.isError && (
          <Card className="border-red-500/70 bg-red-950/40 text-red-50">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
              <div>
                <p className="font-bold">ไม่สามารถโหลดคิวปฏิบัติการ</p>
                <p className="mt-1 text-sm text-red-100">
                  ระบบไม่แสดงข้อมูลที่ยังไม่ได้รับการยืนยันสิทธิ์หรือข้อมูลที่ไม่ครบถ้วน
                </p>
              </div>
              <Button
                onClick={() => void queue.refetch()}
                variant="outline"
                className="ml-auto min-h-11 border-red-300/60 bg-transparent text-red-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                ลองใหม่
              </Button>
            </CardContent>
          </Card>
        )}

        {queue.isLoading && (
          <div className="space-y-3" aria-label="กำลังโหลดคิว">
            <Skeleton className="h-28 bg-slate-800" />
            <Skeleton className="h-28 bg-slate-800" />
            <Skeleton className="h-28 bg-slate-800" />
          </div>
        )}

        {!queue.isLoading &&
          !queue.isError &&
          queue.data?.rows.length === 0 && (
            <Card className="border-slate-700 bg-slate-900 text-slate-50">
              <CardContent className="p-8 text-center">
                <p className="text-lg font-bold">ยังไม่มีรายการตามตัวกรอง</p>
                <p className="mt-2 text-sm text-slate-300">
                  เมื่อมีคำร้องที่ server รับรองแล้ว รายการจะปรากฏที่นี่
                </p>
              </CardContent>
            </Card>
          )}

        <section aria-live="polite" className="space-y-3">
          {queue.data?.rows.map(row => (
            <Card
              key={row.id}
              className="border-slate-700 bg-slate-900 text-slate-50"
            >
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
                <div>
                  <CardTitle className="text-lg">{row.caseCode}</CardTitle>
                  <p className="mt-1 text-xs text-slate-400">
                    รับแจ้ง {new Date(row.receivedAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <Badge
                  className={
                    row.priority === "P1"
                      ? "bg-red-500 text-white"
                      : row.priority === "P2"
                        ? "bg-orange-400 text-slate-950"
                        : "bg-slate-700 text-slate-100"
                  }
                >
                  {row.priority} · {priorityLabel[row.priority]}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-slate-200 sm:grid-cols-3">
                <p>
                  <span className="text-slate-400">สถานะ:</span>{" "}
                  {row.verificationStatus}
                </p>
                <p>
                  <span className="text-slate-400">ช่องทาง:</span> {row.source}
                </p>
                <p>
                  <span className="text-slate-400">Incident:</span>{" "}
                  {row.assignedIncidentId ? "ผูกแล้ว" : "ยังไม่ผูก"}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
        {queue.data?.hasMore && (
          <p className="text-center text-sm text-slate-400">
            มีรายการเพิ่มเติม ระบบจะแบ่งหน้าเพื่อป้องกันการโหลดข้อมูลเกินจำเป็น
          </p>
        )}
        {queue.isFetching && !queue.isLoading && (
          <p className="text-center text-xs text-slate-400">
            กำลังปรับปรุงข้อมูล…
          </p>
        )}
      </div>
    </main>
  );
}
