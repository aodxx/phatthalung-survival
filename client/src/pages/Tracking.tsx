import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import AttachmentUploader from "@/components/AttachmentUploader";

export default function Tracking() {
  const [caseCode, setCaseCode] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const input = useMemo(
    () => ({ caseCode, trackingToken }),
    [caseCode, trackingToken]
  );
  const lookup = trpc.tracking.lookup.useQuery(input, {
    enabled: submitted,
    retry: false,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" /> หน้าแรก
        </Link>
        <section className="mt-7 rounded-3xl bg-white p-6 shadow-xl sm:p-10">
          <div className="grid size-14 place-items-center rounded-2xl bg-cyan-100 text-cyan-800">
            <ClipboardCheck className="size-7" />
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-widest text-cyan-700">
            ติดตามคำร้อง
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            ตรวจสอบสถานะเคส
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            ใช้ Case ID และ tracking token ที่ได้รับหลังระบบยืนยันการรับเรื่อง
            ข้อมูลที่แสดงเป็นข้อมูลสถานะสาธารณะเท่านั้น
          </p>
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-bold text-slate-800">
              Case ID
              <input
                required
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 uppercase outline-none focus:border-cyan-500"
                value={caseCode}
                onChange={event => {
                  setCaseCode(event.target.value);
                  setSubmitted(false);
                }}
                placeholder="PTL-2026-XXXXXXXX"
              />
            </label>
            <label className="block text-sm font-bold text-slate-800">
              Secure tracking token
              <input
                required
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-cyan-500"
                value={trackingToken}
                onChange={event => {
                  setTrackingToken(event.target.value);
                  setSubmitted(false);
                }}
                placeholder="วาง token ที่ได้รับจากระบบ"
              />
            </label>
            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-[#0b3b5a] font-bold hover:bg-[#0d506c]"
            >
              <Search className="mr-2 size-4" /> ตรวจสอบสถานะ
            </Button>
          </form>
          {submitted && lookup.isLoading && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <Loader2 className="size-4 animate-spin" />
              กำลังตรวจสอบโดยไม่เปิดเผยข้อมูลส่วนตัว
            </div>
          )}
          {submitted && lookup.error && (
            <div
              className="mt-6 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800"
              role="alert"
            >
              ไม่สามารถตรวจสอบได้ในขณะนี้ กรุณาลองใหม่เมื่อเครือข่ายพร้อม
              หรือโทรเบอร์ฉุกเฉินหากมีอันตรายเร่งด่วน
            </div>
          )}
          {submitted && !lookup.isLoading && !lookup.error && lookup.data && (
            <>
              <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
                <div className="flex items-center gap-2 text-cyan-900">
                  <ShieldCheck className="size-5" />
                  <span className="font-extrabold">{lookup.data.caseCode}</span>
                </div>
                <p className="mt-4 text-sm text-slate-700">
                  สถานะคำร้อง: <strong>{lookup.data.status}</strong>
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  รับเรื่องเมื่อ{" "}
                  {new Date(lookup.data.receivedAt).toLocaleString("th-TH")}
                </p>
              </div>
              <AttachmentUploader
                caseCode={lookup.data.caseCode}
                trackingToken={trackingToken}
              />
            </>
          )}
          {submitted && !lookup.isLoading && !lookup.error && !lookup.data && (
            <div
              className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              role="status"
            >
              ไม่พบข้อมูลที่ตรงกัน กรุณาตรวจสอบ Case ID และ token
              หรือโทรเบอร์ฉุกเฉินหากต้องการความช่วยเหลือทันที
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
