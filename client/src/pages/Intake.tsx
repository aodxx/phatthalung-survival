import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LocateFixed,
  MapPin,
  Phone,
  Users,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  createClientRequestId,
  drainQueue,
  enqueueCitizenRequest,
  listQueueItems,
  type QueueItem,
} from "@/lib/offlineQueue";
import { trpc } from "@/lib/trpc";
import {
  isSupabaseProductionRuntime,
  submitPublicIntakeProduction,
} from "@/lib/publicApi";

type IntakeDraft = {
  locationMode: "gps" | "text" | "";
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyM: number | null;
  needType:
    | ""
    | "MEDICAL"
    | "EVACUATION"
    | "FLOOD_TRAPPED"
    | "FOOD_WATER"
    | "MEDICINE"
    | "FIRE"
    | "ACCIDENT"
    | "OTHER";
  peopleTotal: string;
  peopleTotalApproximate: boolean;
  vulnerableUnknown: boolean;
  childrenCount: string;
  elderlyCount: string;
  disabledCount: string;
  bedriddenCount: string;
  urgentMedicalCount: string;
  vulnerableNotes: string;
  contactName: string;
  phone: string;
  reporterRelation: "SELF" | "FAMILY" | "NEIGHBOR" | "VOLUNTEER" | "OTHER";
  consent: boolean;
};

const initialDraft: IntakeDraft = {
  locationMode: "",
  locationText: "",
  latitude: null,
  longitude: null,
  gpsAccuracyM: null,
  needType: "",
  peopleTotal: "",
  peopleTotalApproximate: true,
  vulnerableUnknown: false,
  childrenCount: "",
  elderlyCount: "",
  disabledCount: "",
  bedriddenCount: "",
  urgentMedicalCount: "",
  vulnerableNotes: "",
  contactName: "",
  phone: "",
  reporterRelation: "SELF",
  consent: false,
};

const steps = [
  { label: "จุดเกิดเหตุ", icon: MapPin },
  { label: "ประเภทเหตุ", icon: Waves },
  { label: "ผู้ต้องการช่วย", icon: Users },
  { label: "ช่องทางติดต่อ", icon: Phone },
] as const;

export default function Intake() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<IntakeDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [submittedClientRequestId, setSubmittedClientRequestId] = useState<
    string | null
  >(null);
  const [queueItem, setQueueItem] = useState<QueueItem | null>(null);
  const [retrying, setRetrying] = useState(false);
  const { mutateAsync: submitQueued } = trpc.intake.submit.useMutation();

  const update = <K extends keyof IntakeDraft>(
    key: K,
    value: IntakeDraft[K]
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
    setError(null);
  };

  const canContinue = useMemo(() => {
    if (step === 0)
      return Boolean(draft.locationMode && draft.locationText.trim());
    if (step === 1) return Boolean(draft.needType);
    if (step === 2)
      return draft.peopleTotal === "unknown" || Number(draft.peopleTotal) >= 0;
    return (
      /^0\d{8,9}$/.test(draft.phone.replace(/[-\s]/g, "")) && draft.consent
    );
  }, [draft, step]);

  useEffect(() => {
    if (!submittedClientRequestId) return;
    const refresh = () => {
      void listQueueItems().then(items => {
        setQueueItem(
          items.find(
            item => item.clientRequestId === submittedClientRequestId
          ) ?? null
        );
      });
    };
    refresh();
    window.addEventListener("citizen-queue-updated", refresh);
    return () => window.removeEventListener("citizen-queue-updated", refresh);
  }, [submittedClientRequestId]);

  const retrySubmission = async () => {
    if (!queueItem) return;
    setRetrying(true);
    await drainQueue(async item => {
      const response = isSupabaseProductionRuntime()
        ? await submitPublicIntakeProduction(item)
        : await submitQueued(item);
      return {
        acknowledged:
          response.status === "RECEIVED" ||
          response.status === "ALREADY_RECEIVED",
        caseCode: response.caseCode,
        trackingToken: response.trackingToken,
        receivedAt: response.receivedAt,
      };
    });
    const items = await listQueueItems();
    setQueueItem(
      items.find(item => item.clientRequestId === queueItem.clientRequestId) ??
        null
    );
    setRetrying(false);
  };

  const requestGps = () => {
    setGeoMessage(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoMessage(
        "เบราว์เซอร์นี้ไม่รองรับ GPS กรุณาพิมพ์ตำแหน่งหรือจุดสังเกตแทน"
      );
      update("locationMode", "text");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        update("locationMode", "gps");
        update("latitude", position.coords.latitude);
        update("longitude", position.coords.longitude);
        update("gpsAccuracyM", position.coords.accuracy);
        update("locationText", "ตำแหน่ง GPS จากอุปกรณ์");
        setGeoMessage(
          "ได้รับตำแหน่ง GPS แล้ว ตรวจสอบจุดสังเกตเพิ่มเติมได้ด้านล่าง"
        );
      },
      reason => {
        const message =
          reason.code === 1
            ? "ไม่ได้รับอนุญาตให้ใช้ GPS กรุณาพิมพ์ตำแหน่งหรือจุดสังเกตแทน"
            : reason.code === 2
              ? "ไม่สามารถระบุตำแหน่งได้ในขณะนี้ กรุณาพิมพ์ตำแหน่งแทน"
              : "GPS ใช้เวลานานเกินไป กรุณาพิมพ์ตำแหน่งหรือจุดสังเกตแทน";
        setGeoMessage(message);
        update("locationMode", "text");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const next = async () => {
    if (!canContinue) {
      setError(
        step === 3
          ? "กรุณาตรวจสอบเบอร์โทรและยินยอมให้เจ้าหน้าที่ติดต่อกลับ"
          : "กรุณากรอกข้อมูลที่จำเป็นให้ครบก่อนดำเนินการต่อ"
      );
      return;
    }
    if (step < steps.length - 1) {
      setStep(current => current + 1);
      return;
    }

    try {
      const clientRequestId = createClientRequestId();
      await enqueueCitizenRequest({
        clientRequestId,
        createdAt: new Date().toISOString(),
        locationMode: draft.locationMode as "gps" | "text",
        locationText: draft.locationText.trim(),
        needType: draft.needType || "OTHER",
        peopleTotal:
          draft.peopleTotal === "unknown" || draft.peopleTotal === ""
            ? null
            : Number(draft.peopleTotal),
        peopleTotalApproximate: draft.peopleTotalApproximate,
        vulnerableUnknown: draft.vulnerableUnknown,
        vulnerableNotes: draft.vulnerableNotes.trim(),
        contactName: draft.contactName.trim(),
        phone: draft.phone,
        reporterRelation: draft.reporterRelation,
        latitude: draft.latitude,
        longitude: draft.longitude,
        gpsAccuracyM: draft.gpsAccuracyM,
        childrenCount:
          draft.childrenCount === "" ? null : Number(draft.childrenCount),
        elderlyCount:
          draft.elderlyCount === "" ? null : Number(draft.elderlyCount),
        disabledCount:
          draft.disabledCount === "" ? null : Number(draft.disabledCount),
        bedriddenCount:
          draft.bedriddenCount === "" ? null : Number(draft.bedriddenCount),
        urgentMedicalCount:
          draft.urgentMedicalCount === ""
            ? null
            : Number(draft.urgentMedicalCount),
      });
      setSubmittedClientRequestId(clientRequestId);
      setSubmitted(true);
    } catch {
      setError(
        "อุปกรณ์นี้ยังไม่รองรับการเก็บข้อมูลออฟไลน์ กรุณาโทรเบอร์ฉุกเฉินแทน"
      );
    }
  };

  if (submitted) {
    const status = queueItem?.status ?? "PENDING";
    const acknowledged = status === "SENT" && Boolean(queueItem?.caseCode);
    const statusLabel =
      status === "SENT"
        ? "ระบบได้รับข้อมูลแล้ว"
        : status === "SENDING"
          ? "กำลังส่งข้อมูล"
          : status === "FAILED"
            ? "ส่งข้อมูลไม่สำเร็จ"
            : "บันทึกไว้ในเครื่อง รอส่ง";
    return (
      <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
          <div
            className={`mx-auto grid size-16 place-items-center rounded-full ${acknowledged ? "bg-emerald-100 text-emerald-700" : status === "FAILED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
          >
            <Check className="size-8" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-extrabold text-slate-950">
            {statusLabel}
          </h1>
          <p className="mt-3 text-center leading-7 text-slate-600">
            {acknowledged
              ? "คำร้องได้รับการตอบรับจากเซิร์ฟเวอร์แล้ว เก็บข้อมูลติดตามนี้ไว้สำหรับตรวจสอบความคืบหน้า"
              : (queueItem?.lastError ??
                "ระบบจะส่งคำร้องอัตโนมัติเมื่อเชื่อมต่ออินเทอร์เน็ตได้")}
          </p>
          {acknowledged && queueItem?.caseCode && (
            <div className="mt-6 space-y-3 rounded-2xl bg-emerald-50 p-4 text-emerald-950">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">Case ID</span>
                <span className="font-mono font-extrabold">
                  {queueItem.caseCode}
                </span>
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm font-bold shadow-sm"
                onClick={() =>
                  void navigator.clipboard?.writeText(queueItem.caseCode ?? "")
                }
              >
                คัดลอก Case ID
              </button>
              {queueItem.trackingToken && (
                <>
                  <p className="break-all font-mono text-xs">
                    Tracking Token: {queueItem.trackingToken}
                  </p>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-white px-3 py-2 text-sm font-bold shadow-sm"
                    onClick={() =>
                      void navigator.clipboard?.writeText(
                        queueItem.trackingToken ?? ""
                      )
                    }
                  >
                    คัดลอก Tracking Token
                  </button>
                </>
              )}
              <Link
                href="/tracking"
                className="block rounded-xl bg-[#0b3b5a] px-3 py-3 text-center text-sm font-bold text-white"
              >
                ติดตามเคสนี้
              </Link>
            </div>
          )}
          {(status === "FAILED" || status === "PENDING") && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => void retrySubmission()}
              className="mt-6 w-full rounded-2xl bg-[#0b3b5a] px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {retrying ? "กำลังลองส่งอีกครั้ง…" : "ลองส่งอีกครั้ง"}
            </button>
          )}
          <Link
            href="/"
            className="mt-6 block text-center text-sm font-bold text-cyan-800 underline underline-offset-4"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  const StepIcon = steps[step].icon;
  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" /> หน้าแรก
          </Link>
          <span className="text-sm font-bold text-slate-500">
            ขั้นตอน {step + 1} จาก {steps.length}
          </span>
        </div>

        <div className="mt-7 rounded-3xl bg-white p-5 shadow-xl sm:p-8">
          <div
            className="grid grid-cols-4 gap-2"
            aria-label="ความคืบหน้าของแบบฟอร์ม"
          >
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`rounded-2xl p-2 text-center text-[11px] font-bold sm:p-3 sm:text-xs ${index <= step ? "bg-cyan-50 text-cyan-800" : "bg-slate-100 text-slate-400"}`}
                >
                  <Icon className="mx-auto mb-1 size-4" />
                  {item.label}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-800">
              <StepIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-700">
                แจ้งเหตุฉุกเฉิน
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {steps[step].label}
              </h1>
            </div>
          </div>

          <div className="mt-8">
            {step === 0 && (
              <LocationStep
                draft={draft}
                update={update}
                requestGps={requestGps}
                geoMessage={geoMessage}
              />
            )}
            {step === 1 && (
              <IncidentTypeStep value={draft.needType} update={update} />
            )}
            {step === 2 && <PeopleStep draft={draft} update={update} />}
            {step === 3 && <ContactStep draft={draft} update={update} />}
          </div>

          {error && (
            <p
              className="mt-5 rounded-2xl bg-red-50 p-3 text-sm font-semibold leading-6 text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              className="h-12 rounded-2xl"
              disabled={step === 0}
              onClick={() => {
                setStep(current => current - 1);
                setError(null);
              }}
            >
              <ArrowLeft className="mr-2 size-4" /> ย้อนกลับ
            </Button>
            <Button
              className="h-12 rounded-2xl bg-[#0b3b5a] font-bold hover:bg-[#0d506c]"
              onClick={next}
            >
              {step === steps.length - 1 ? "ตรวจข้อมูล" : "ถัดไป"}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function LocationStep({
  draft,
  update,
  requestGps,
  geoMessage,
}: {
  draft: IntakeDraft;
  update: <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => void;
  requestGps: () => void;
  geoMessage: string | null;
}) {
  return (
    <div className="space-y-4">
      <p className="leading-7 text-slate-600">
        บอกตำแหน่งให้ทีมเข้าถึงได้เร็วที่สุด เลือก GPS
        หรือพิมพ์ที่อยู่/จุดสังเกต
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-2xl border p-4 text-left ${draft.locationMode === "gps" ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white"}`}
          onClick={requestGps}
        >
          <LocateFixed className="size-5 text-cyan-700" />
          <p className="mt-3 font-bold text-slate-950">ใช้ตำแหน่ง GPS</p>
          <p className="mt-1 text-sm text-slate-600">
            ระบบจะขอสิทธิ์ตำแหน่งจากอุปกรณ์
          </p>
        </button>
        <button
          type="button"
          className={`rounded-2xl border p-4 text-left ${draft.locationMode === "text" ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white"}`}
          onClick={() => update("locationMode", "text")}
        >
          <MapPin className="size-5 text-cyan-700" />
          <p className="mt-3 font-bold text-slate-950">พิมพ์ตำแหน่งเอง</p>
          <p className="mt-1 text-sm text-slate-600">
            เช่น บ้านเลขที่ วัด โรงเรียน หรือจุดสังเกต
          </p>
        </button>
      </div>
      <label className="block text-sm font-bold text-slate-800">
        ตำแหน่งหรือจุดสังเกต<span className="text-red-600"> *</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500"
          value={draft.locationText}
          onChange={event => update("locationText", event.target.value)}
          placeholder="ระบุบริเวณที่ต้องการความช่วยเหลือ"
        />
      </label>
      {geoMessage && (
        <p
          className="rounded-2xl bg-cyan-50 p-3 text-sm font-semibold leading-6 text-cyan-900"
          role="status"
        >
          {geoMessage}
        </p>
      )}
    </div>
  );
}

function IncidentTypeStep({
  value,
  update,
}: {
  value: string;
  update: <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => void;
}) {
  const options = [
    { code: "FLOOD_TRAPPED", label: "น้ำท่วม/น้ำป่า หรือติดค้าง" },
    { code: "MEDICAL", label: "เจ็บป่วยหรืออุบัติเหตุ" },
    { code: "EVACUATION", label: "ต้องการอพยพ" },
    { code: "FOOD_WATER", label: "ขาดอาหารหรือน้ำ" },
    { code: "MEDICINE", label: "ขาดยาหรืออุปกรณ์การแพทย์" },
    { code: "FIRE", label: "ไฟไหม้หรือควันไฟ" },
    { code: "ACCIDENT", label: "อุบัติเหตุ" },
    { code: "OTHER", label: "เหตุอันตรายอื่น ๆ" },
  ] as const;
  return (
    <div className="space-y-4">
      <p className="leading-7 text-slate-600">
        เลือกประเภทที่ใกล้เคียงที่สุด เจ้าหน้าที่จะตรวจสอบรายละเอียดอีกครั้ง
      </p>
      <div className="grid gap-3">
        {options.map(option => (
          <button
            key={option.code}
            type="button"
            className={`rounded-2xl border p-4 text-left font-bold ${value === option.code ? "border-cyan-500 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white text-slate-800"}`}
            onClick={() => update("needType", option.code)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PeopleStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="leading-7 text-slate-600">
        ระบุจำนวนโดยประมาณเพื่อให้ทีมเตรียมกำลังและอุปกรณ์ได้เหมาะสม
      </p>
      <label className="block text-sm font-bold text-slate-800">
        จำนวนผู้ต้องการความช่วยเหลือ
        <input
          inputMode="numeric"
          type="number"
          min="0"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-cyan-500 disabled:bg-slate-100"
          value={draft.peopleTotal === "unknown" ? "" : draft.peopleTotal}
          disabled={draft.peopleTotal === "unknown"}
          onChange={event => update("peopleTotal", event.target.value)}
          placeholder="เช่น 3"
        />
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          className="size-4 accent-cyan-700"
          checked={draft.peopleTotal === "unknown"}
          onChange={event =>
            update("peopleTotal", event.target.checked ? "unknown" : "")
          }
        />
        ไม่ทราบจำนวนผู้ต้องการความช่วยเหลือ
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          className="size-4 accent-cyan-700"
          checked={draft.peopleTotalApproximate}
          onChange={event =>
            update("peopleTotalApproximate", event.target.checked)
          }
        />
        จำนวนเป็นการประมาณการ
      </label>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["childrenCount", "เด็ก"],
            ["elderlyCount", "ผู้สูงอายุ"],
            ["disabledCount", "ผู้พิการ"],
            ["bedriddenCount", "ผู้ป่วยติดเตียง"],
            ["urgentMedicalCount", "ต้องการแพทย์เร่งด่วน"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm font-bold text-slate-800">
            {label}
            <input
              inputMode="numeric"
              type="number"
              min="0"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-cyan-500"
              value={draft[key]}
              onChange={event => update(key, event.target.value)}
              placeholder="0"
            />
          </label>
        ))}
      </div>
      <label className="block text-sm font-bold text-slate-800">
        ข้อมูลผู้เปราะบางหรือความต้องการพิเศษ
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500"
          value={draft.vulnerableNotes}
          onChange={event => update("vulnerableNotes", event.target.value)}
          placeholder="สิ่งที่ทีมควรรู้เพิ่มเติม"
        />
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          className="size-4 accent-cyan-700"
          checked={draft.vulnerableUnknown}
          onChange={event => update("vulnerableUnknown", event.target.checked)}
        />
        ไม่ทราบข้อมูลผู้เปราะบางในขณะนี้
      </label>
    </div>
  );
}

function ContactStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="leading-7 text-slate-600">
        ข้อมูลนี้ใช้เพื่อให้เจ้าหน้าที่ติดต่อกลับเท่าที่จำเป็น
        ไม่ต้องสร้างบัญชีผู้ใช้
      </p>
      <label className="block text-sm font-bold text-slate-800">
        ชื่อผู้แจ้ง
        <input
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-cyan-500"
          value={draft.contactName}
          onChange={event => update("contactName", event.target.value)}
          placeholder="ชื่อหรือชื่อเล่น"
        />
      </label>
      <label className="block text-sm font-bold text-slate-800">
        ความสัมพันธ์กับผู้ต้องการความช่วยเหลือ
        <select
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-cyan-500"
          value={draft.reporterRelation}
          onChange={event =>
            update(
              "reporterRelation",
              event.target.value as IntakeDraft["reporterRelation"]
            )
          }
        >
          <option value="SELF">แจ้งแทนตนเอง</option>
          <option value="FAMILY">คนในครอบครัว</option>
          <option value="NEIGHBOR">เพื่อนบ้าน</option>
          <option value="VOLUNTEER">อาสาสมัคร</option>
          <option value="OTHER">อื่น ๆ</option>
        </select>
      </label>
      <label className="block text-sm font-bold text-slate-800">
        เบอร์โทรศัพท์สำหรับติดต่อกลับ<span className="text-red-600"> *</span>
        <input
          inputMode="tel"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-cyan-500"
          value={draft.phone}
          onChange={event => update("phone", event.target.value)}
          placeholder="08xxxxxxxx"
        />
      </label>
      <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-cyan-700"
          checked={draft.consent}
          onChange={event => update("consent", event.target.checked)}
        />
        ยินยอมให้เจ้าหน้าที่ใช้ข้อมูลนี้เพื่อติดต่อและประสานการช่วยเหลือเคสนี้เท่านั้น
      </label>
    </div>
  );
}
