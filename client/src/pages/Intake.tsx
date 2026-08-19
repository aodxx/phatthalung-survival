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
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  createClientRequestId,
  enqueueCitizenRequest,
} from "@/lib/offlineQueue";

type IntakeDraft = {
  locationMode: "gps" | "text" | "";
  locationText: string;
  incidentType: string;
  peopleTotal: string;
  vulnerableNotes: string;
  contactName: string;
  phone: string;
  consent: boolean;
};

const initialDraft: IntakeDraft = {
  locationMode: "",
  locationText: "",
  incidentType: "",
  peopleTotal: "",
  vulnerableNotes: "",
  contactName: "",
  phone: "",
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
    if (step === 1) return Boolean(draft.incidentType);
    if (step === 2) return Number(draft.peopleTotal) > 0;
    return (
      /^0\d{8,9}$/.test(draft.phone.replace(/[-\s]/g, "")) && draft.consent
    );
  }, [draft, step]);

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
      await enqueueCitizenRequest({
        clientRequestId: createClientRequestId(),
        createdAt: new Date().toISOString(),
        locationMode: draft.locationMode as "gps" | "text",
        locationText: draft.locationText.trim(),
        incidentType: draft.incidentType,
        peopleTotal: Number(draft.peopleTotal),
        vulnerableNotes: draft.vulnerableNotes.trim(),
        contactName: draft.contactName.trim(),
        phone: draft.phone.replace(/[\s-]/g, ""),
      });
      setSubmitted(true);
    } catch {
      setError(
        "อุปกรณ์นี้ยังไม่รองรับการเก็บข้อมูลออฟไลน์ กรุณาโทรเบอร์ฉุกเฉินแทน"
      );
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-8" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-extrabold text-slate-950">
            ตรวจข้อมูลพร้อมส่งแล้ว
          </h1>
          <p className="mt-3 text-center leading-7 text-slate-600">
            ขั้นตอนถัดไปจะเก็บคำร้องลงคิวในเครื่องและส่งต่อเมื่อระบบเชื่อมต่อได้
            โปรดอย่าปิดหน้านี้หากยังไม่เห็นข้อความยืนยันจากเซิร์ฟเวอร์
          </p>
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Phase 1 กำลังเชื่อม IndexedDB queue และ server acknowledgement ตาม
            contract ที่กำหนดไว้ใน Blueprint
          </div>
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
            {step === 0 && <LocationStep draft={draft} update={update} />}
            {step === 1 && (
              <IncidentTypeStep value={draft.incidentType} update={update} />
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
}: {
  draft: IntakeDraft;
  update: <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => void;
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
          onClick={() => update("locationMode", "gps")}
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
    "น้ำท่วม/น้ำป่า",
    "เจ็บป่วยหรืออุบัติเหตุ",
    "ติดค้าง/อพยพ",
    "ขาดอาหาร น้ำ หรือยา",
    "เหตุอันตรายอื่น ๆ",
  ];
  return (
    <div className="space-y-4">
      <p className="leading-7 text-slate-600">
        เลือกประเภทที่ใกล้เคียงที่สุด เจ้าหน้าที่จะตรวจสอบรายละเอียดอีกครั้ง
      </p>
      <div className="grid gap-3">
        {options.map(option => (
          <button
            key={option}
            type="button"
            className={`rounded-2xl border p-4 text-left font-bold ${value === option ? "border-cyan-500 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white text-slate-800"}`}
            onClick={() => update("incidentType", option)}
          >
            {option}
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
        จำนวนผู้ต้องการความช่วยเหลือ<span className="text-red-600"> *</span>
        <input
          inputMode="numeric"
          type="number"
          min="1"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-cyan-500"
          value={draft.peopleTotal}
          onChange={event => update("peopleTotal", event.target.value)}
          placeholder="เช่น 3"
        />
      </label>
      <label className="block text-sm font-bold text-slate-800">
        ข้อมูลผู้เปราะบางหรือความต้องการพิเศษ
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500"
          value={draft.vulnerableNotes}
          onChange={event => update("vulnerableNotes", event.target.value)}
          placeholder="เด็ก ผู้สูงอายุ ผู้ป่วยติดเตียง ผู้พิการ หรือสิ่งที่ทีมควรรู้"
        />
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
