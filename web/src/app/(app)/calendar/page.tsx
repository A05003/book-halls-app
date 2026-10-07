import Link from "next/link";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listBookings, listHalls } from "@/lib/queries";
import { SECTION_LABEL } from "@/lib/sections";
import { parseDateOnly, toGregorianLabel, toHijri, toISODate } from "@/lib/dates";
import { Btn, Card, STATUS_LABEL, StatusTag, inputCls } from "@/components/ui";

type SP = { view?: string; m?: string; d?: string; hall?: string; status?: string };

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const monthLabel = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" });
const todayISO = () => new Date().toISOString().slice(0, 10);

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";
  const hallId = sp.hall ? Number(sp.hall) : undefined;
  const status = (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).find((s) => s === sp.status);
  const halls = await listHalls();
  const canCreate = can(user.role, "booking:create");

  const anchorStr = view === "month" ? `${/^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m : todayISO().slice(0, 7)}-01` : /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayISO();
  const anchor = parseDateOnly(anchorStr);

  let cells: (Date | null)[];
  let from: Date, to: Date, prev: string, next: string, title: string;
  if (view === "month") {
    const first = anchor;
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
    cells = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: last.getUTCDate() }, (_, i) => addDays(first, i))];
    from = first;
    to = last;
    const pm = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - 1, 1, 12));
    const nm = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1, 12));
    prev = `m=${toISODate(pm).slice(0, 7)}`;
    next = `m=${toISODate(nm).slice(0, 7)}`;
    title = monthLabel.format(first);
  } else {
    const start = addDays(anchor, -anchor.getUTCDay());
    cells = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    from = start;
    to = addDays(start, 6);
    prev = `d=${toISODate(addDays(start, -7))}`;
    next = `d=${toISODate(addDays(start, 7))}`;
    title = `${toGregorianLabel(start)} – ${toGregorianLabel(to)}`;
  }

  const bookings = await listBookings({ hallId, status, from, to });
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const k = toISODate(b.gregorianDate);
    byDay.set(k, [...(byDay.get(k) ?? []), b]);
  }
  const q = (extra: string) =>
    `/calendar?view=${view}&${extra}${hallId ? `&hall=${hallId}` : ""}${status ? `&status=${status}` : ""}`;
  const tone = (s: string) =>
    s === "CONFIRMED" ? "bg-good/15 text-good border-good/30" : s === "TENTATIVE" ? "bg-warn/15 text-warn border-warn/30" : s === "COMPLETED" ? "bg-soft text-muted border-line" : "bg-bad/10 text-bad border-bad/30 line-through";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">التقويم والحجوزات</h1>
        {canCreate && (
          <Link href="/bookings/new" className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">
            إضافة حجز جديد
          </Link>
        )}
      </div>

      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="view" value={view} />
          {view === "month" ? <input type="hidden" name="m" value={anchorStr.slice(0, 7)} /> : <input type="hidden" name="d" value={anchorStr} />}
          <label className="grid gap-1 text-sm font-semibold text-muted">
            القاعة
            <select name="hall" defaultValue={sp.hall ?? ""} className={inputCls}>
              <option value="">كل القاعات</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-muted">
            حالة الحجز
            <select name="status" defaultValue={status ?? ""} className={inputCls}>
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <Btn type="submit" variant="ghost">تصفية</Btn>
          <div className="ms-auto inline-flex rounded-lg bg-soft p-1 text-sm font-bold" role="group" aria-label="نوع العرض">
            <Link href={q(`m=${anchorStr.slice(0, 7)}`).replace("view=week", "view=month")} aria-current={view === "month"} className={`rounded-md px-3 py-1 ${view === "month" ? "bg-surface" : "text-muted"}`}>شهري</Link>
            <Link href={q(`d=${view === "week" ? anchorStr : todayISO()}`).replace("view=month", "view=week")} aria-current={view === "week"} className={`rounded-md px-3 py-1 ${view === "week" ? "bg-surface" : "text-muted"}`}>أسبوعي</Link>
          </div>
        </form>
      </Card>

      <Card
        title={title}
        actions={
          <div className="flex gap-1 text-sm font-bold">
            <Link href={q(prev)} className="rounded-lg bg-soft px-3 py-1">السابق</Link>
            <Link href={q(view === "month" ? `m=${todayISO().slice(0, 7)}` : `d=${todayISO()}`)} className="rounded-lg bg-soft px-3 py-1">اليوم</Link>
            <Link href={q(next)} className="rounded-lg bg-soft px-3 py-1">التالي</Link>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7 gap-1.5">
            {DAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-bold text-muted">{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const iso = toISODate(d);
              const list = byDay.get(iso) ?? [];
              const isToday = iso === todayISO();
              return (
                <div key={iso} className={`min-h-24 rounded-lg border p-1.5 ${isToday ? "border-gold border-2" : "border-line"} ${view === "week" ? "min-h-48" : ""}`}>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted">
                    <span className="font-bold">{d.getUTCDate()}</span>
                    {view === "week" && <span>{toHijri(d)}</span>}
                    {canCreate && list.length === 0 && (
                      <Link href={`/bookings/new?date=${iso}${hallId ? `&hall=${hallId}` : ""}`} aria-label={`حجز جديد بتاريخ ${iso}`} className="rounded bg-soft px-1.5 font-bold text-ink">+</Link>
                    )}
                  </div>
                  <div className="grid gap-1">
                    {list.map((b) => (
                      <Link key={b.id} href={`/bookings/${b.id}`} className={`block truncate rounded border px-1.5 py-0.5 text-xs font-bold ${tone(b.status)}`} title={`${b.client.name} · ${SECTION_LABEL[b.sectionType]}`}>
                        {b.contractNumber} · {b.client.name}
                        {view === "week" && <span className="block font-normal">{SECTION_LABEL[b.sectionType]} · {b.hall.name}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          <StatusTag status="CONFIRMED" /> <StatusTag status="TENTATIVE" /> <StatusTag status="COMPLETED" /> <StatusTag status="CANCELLED" />
        </p>
      </Card>
    </div>
  );
}
