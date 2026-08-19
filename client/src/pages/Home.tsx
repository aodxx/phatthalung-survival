import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  ClipboardCheck,
  HeartPulse,
  LifeBuoy,
  MapPin,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";

const emergencyContacts = [
  { label: "แจ้งเหตุฉุกเฉิน", number: "1669", note: "เจ็บป่วยหรืออุบัติเหตุ" },
  { label: "ตำรวจ", number: "191", note: "เหตุอันตรายเร่งด่วน" },
  {
    label: "ป้องกันและบรรเทาสาธารณภัย",
    number: "1784",
    note: "ภัยพิบัติและการอพยพ",
  },
];

export default function Home() {
  const [notice, setNotice] = useState<string | null>(null);

  const showComingSoon = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3600);
  };

  return (
    <main className="crisis-shell min-h-screen overflow-hidden">
      <section className="hero-panel">
        <div className="container relative z-10 py-6 sm:py-10">
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="brand-mark" aria-hidden="true">
                <ShieldCheck className="size-6" strokeWidth={2.4} />
              </div>
              <div>
                <p className="eyebrow">ศูนย์ปฏิบัติการชุมชน</p>
                <h1 className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  พัทลุงต้องรอด
                </h1>
              </div>
            </div>
            <div className="status-pill" aria-label="สถานะระบบพร้อมรับแจ้ง">
              <span className="status-dot" aria-hidden="true" />
              ระบบพร้อมรับแจ้ง
            </div>
          </header>

          <div className="hero-copy max-w-3xl">
            <p className="eyebrow mb-3">
              เมื่อเกิดเหตุ อย่ารอให้สถานการณ์แย่ลง
            </p>
            <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-6xl">
              ขอความช่วยเหลือ
              <span className="block text-cyan-200">ให้ถึงคนที่ต้องการ</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
              แจ้งเหตุได้จากมือถือ แม้สัญญาณไม่เสถียร
              ข้อมูลสำคัญจะถูกเก็บไว้อย่างปลอดภัยและส่งต่อเมื่อเชื่อมต่อได้
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="primary-emergency-button h-14 rounded-2xl px-6 text-base font-bold sm:h-16 sm:px-8 sm:text-lg"
              onClick={() => {
                window.location.href = "/intake";
              }}
            >
              <LifeBuoy className="mr-2 size-5" />
              ขอความช่วยเหลือ
              <ArrowRight className="ml-auto size-5 sm:ml-3" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="secondary-hero-button h-14 rounded-2xl border-white/30 px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white sm:h-16"
              onClick={() =>
                showComingSoon("ระบบติดตามเคสจะเปิดใช้งานหลัง Intake API พร้อม")
              }
            >
              <ClipboardCheck className="mr-2 size-5" />
              ติดตามเคส
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
            <span className="hero-trust-item">
              <MapPin className="size-4" /> ใช้ GPS หรือบอกจุดสังเกต
            </span>
            <span className="hero-trust-item">
              <HeartPulse className="size-4" /> ไม่ต้องสมัครสมาชิก
            </span>
            <span className="hero-trust-item">
              <ShieldCheck className="size-4" /> ข้อมูลถูกปกป้อง
            </span>
          </div>
        </div>
      </section>

      <section className="container relative z-20 -mt-5 pb-12 sm:-mt-8 sm:pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard
            icon={<BellRing className="size-5" />}
            title="ประกาศล่าสุด"
            description="ดูข้อมูลเตือนภัยที่ผ่านการยืนยัน"
            onClick={() =>
              showComingSoon(
                "ประกาศสาธารณะจะเชื่อมกับ Operations ใน Phase ถัดไป"
              )
            }
          />
          <ActionCard
            icon={<MapPin className="size-5" />}
            title="จุดปลอดภัย"
            description="ศูนย์พักพิงและจุดรวมพลในพื้นที่"
            onClick={() =>
              showComingSoon("ข้อมูลศูนย์พักพิงอยู่ในขอบเขต Phase 2")
            }
          />
          <ActionCard
            icon={<PhoneCall className="size-5" />}
            title="เบอร์โทรฉุกเฉิน"
            description="ติดต่อหน่วยงานที่เกี่ยวข้องทันที"
            href="#emergency-contacts"
          />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="section-kicker">
              <span /> ช่องทางช่วยเหลือ
            </div>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              เลือกช่องทางที่เหมาะกับสถานการณ์
            </h3>
            <p className="mt-3 max-w-xl leading-7 text-slate-600">
              หากยังส่งข้อมูลไม่ได้ ให้โทรเบอร์ฉุกเฉินโดยตรง
              เมื่อระบบรับแจ้งพร้อมใช้งาน คุณจะสามารถติดตามสถานะด้วย Case ID
              และรหัสติดตามที่ปลอดภัย
            </p>
          </div>
          <Card className="info-card">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="icon-tile">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-950">
                    หากอยู่ในอันตรายทันที
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    ไปยังจุดปลอดภัยก่อน แล้วติดต่อหน่วยงานฉุกเฉิน
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div
          id="emergency-contacts"
          className="mt-10 grid gap-3 sm:grid-cols-3"
        >
          {emergencyContacts.map(contact => (
            <a
              key={contact.number}
              className="contact-card"
              href={`tel:${contact.number}`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-600">
                  {contact.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                  {contact.number}
                </p>
                <p className="mt-1 text-xs text-slate-500">{contact.note}</p>
              </div>
              <PhoneCall className="size-5 text-cyan-700" />
            </a>
          ))}
        </div>
      </section>

      {notice && (
        <div className="toast-notice" role="status">
          <ShieldCheck className="size-5 shrink-0 text-cyan-700" />
          <span>{notice}</span>
        </div>
      )}
    </main>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
  href,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <div className="icon-tile">{icon}</div>
      <div className="min-w-0">
        <p className="font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
      </div>
      <ArrowRight className="ml-auto size-4 shrink-0 text-slate-400" />
    </>
  );

  if (href)
    return (
      <a className="action-card" href={href}>
        {content}
      </a>
    );
  return (
    <button className="action-card text-left" onClick={onClick} type="button">
      {content}
    </button>
  );
}
