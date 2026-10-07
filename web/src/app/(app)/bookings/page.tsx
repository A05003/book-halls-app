import Link from "next/link";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listBookings, listHalls, totalsOf } from "@/lib/queries";
import { SECTION_LABEL } from "@/lib/sections";
import { toGregorianLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Btn, Card, LinkBtn, STATUS_LABEL, StatusTag, inputCls } from "@/components/ui";

type SP = { q?: string; hall?: string; status?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).find((s) => s === sp.status);
  const [halls, rows] = await Promise.all([
    listHalls(),
    listBookings({ hallId: sp.hall ? Number(sp.hall) : undefined, status, q: sp.q?.trim() || undefined }),
  ]);
  const showMoney = can(user.role, "payment:create") || can(user.role, "report:view");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">الحجوزات</h1>
        {can(user.role, "booking:create") && <LinkBtn href="/bookings/new">إضافة حجز جديد</LinkBtn>}
      </div>
      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="grid gap-1 text-sm font-semibold text-muted">
            بحث (عميل، جوال، رقم عقد)
            <input name="q" defaultValue={sp.q ?? ""} className={inputCls} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-muted">
            القاعة
            <select name="hall" defaultValue={sp.hall ?? ""} className={inputCls}>
              <option value="">الكل</option>
              {halls.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-muted">
            الحالة
            <select name="status" defaultValue={status ?? ""} className={inputCls}>
              <option value="">الكل</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </label>
          <Btn type="submit" variant="ghost">تصفية</Btn>
        </form>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-start text-xs text-muted">
              <tr>
                {["رقم العقد", "العميل", "القاعة", "التاريخ", "القسم", "الحالة", ...(showMoney ? ["الإجمالي", "المتبقي"] : [])].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b border-line p-2 text-start font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const t = totalsOf(b);
                return (
                  <tr key={b.id} className="border-b border-line hover:bg-soft/50">
                    <td className="p-2 font-bold"><Link href={`/bookings/${b.id}`} className="text-blue underline">{b.contractNumber}</Link></td>
                    <td className="p-2">{b.client.name}<div className="text-xs text-muted" dir="ltr">{b.client.phone}</div></td>
                    <td className="p-2">{b.hall.name}</td>
                    <td className="whitespace-nowrap p-2">{toGregorianLabel(b.gregorianDate)}<div className="text-xs text-muted">{b.hijriDate}</div></td>
                    <td className="p-2">{SECTION_LABEL[b.sectionType]}</td>
                    <td className="p-2"><StatusTag status={b.status} /></td>
                    {showMoney && <td className="whitespace-nowrap p-2">{formatMoney(t.totalRevenue)}</td>}
                    {showMoney && <td className="whitespace-nowrap p-2">{b.status === "CANCELLED" ? "—" : formatMoney(t.remaining)}</td>}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-muted">لا توجد حجوزات مطابقة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
