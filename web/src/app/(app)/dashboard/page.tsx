import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listBookings, listHalls, totalsOf } from "@/lib/queries";
import { sumMoney, subMoney, formatMoney } from "@/lib/money";
import { parseDateOnly, toISODate } from "@/lib/dates";
import { Btn, Card, inputCls } from "@/components/ui";
import { MonthlyChart, type MonthPoint } from "@/components/MonthlyChart";

type SP = { hall?: string; from?: string; to?: string };
const monthName = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "short", year: "2-digit", timeZone: "UTC" });
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

function Kpi({ label, value, hl }: { label: string; value: string; hl?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border p-4 ${hl ? "border-navy bg-navy text-white" : "border-line bg-surface"}`}>
      <div className={`text-sm ${hl ? "text-white/70" : "text-muted"}`}>{label}</div>
      <div className={`text-2xl font-extrabold ${hl ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  if (!can(user.role, "report:view")) redirect("/calendar");
  const sp = await searchParams;
  const year = new Date().getUTCFullYear();
  const from = isDate(sp.from) ? sp.from! : `${year}-01-01`;
  const to = isDate(sp.to) ? sp.to! : `${year}-12-31`;
  const hallId = sp.hall ? Number(sp.hall) : undefined;

  const [halls, rows] = await Promise.all([
    listHalls(),
    listBookings({ hallId, from: parseDateOnly(from), to: parseDateOnly(to) }),
  ]);
  const live = rows.filter((b) => b.status !== "CANCELLED").map((b) => ({ b, t: totalsOf(b) }));
  const sum = (f: (t: ReturnType<typeof totalsOf>) => number) => sumMoney(live.map(({ t }) => f(t)));

  const revenue = sum((t) => t.totalRevenue);
  const expenses = sum((t) => t.totalExpenses);
  const net = subMoney(revenue, expenses);

  const byMonth = new Map<string, { rev: number[]; exp: number[] }>();
  for (const { b, t } of live) {
    const k = toISODate(b.gregorianDate).slice(0, 7);
    const m = byMonth.get(k) ?? { rev: [], exp: [] };
    m.rev.push(t.totalRevenue);
    m.exp.push(t.totalExpenses);
    byMonth.set(k, m);
  }
  const chart: MonthPoint[] = [...byMonth.entries()].sort().map(([k, v]) => ({
    label: monthName.format(parseDateOnly(`${k}-01`)),
    revenue: sumMoney(v.rev),
    expenses: sumMoney(v.exp),
  }));

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">التقارير المالية</h1>
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-semibold text-muted">القاعة
            <select name="hall" defaultValue={sp.hall ?? ""} className={inputCls}>
              <option value="">كل القاعات</option>
              {halls.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-muted">من تاريخ<input type="date" name="from" defaultValue={from} className={inputCls} /></label>
          <label className="grid gap-1 text-sm font-semibold text-muted">إلى تاريخ<input type="date" name="to" defaultValue={to} className={inputCls} /></label>
          <Btn type="submit">عرض</Btn>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="إجمالي عقود الإيجار" value={formatMoney(sum((t) => t.rental))} />
        <Kpi label="إجمالي عقود التنسيق" value={formatMoney(sum((t) => t.coordinationAmount))} />
        <Kpi label="إجمالي الزيادات" value={formatMoney(sum((t) => t.extrasCharged))} />
        <Kpi label="إجمالي المصاريف" value={formatMoney(expenses)} />
        <Kpi label="إجمالي المحصّل" value={formatMoney(sum((t) => t.totalPaid))} />
        <Kpi label="المتبقي لدى العملاء" value={formatMoney(sum((t) => t.remaining))} />
        <Kpi label="عدد الحفلات" value={String(live.length)} />
        <Kpi label="صافي الربح الإجمالي" value={formatMoney(net)} hl />
      </div>

      <Card title="إيرادات ومصروفات كل شهر (حسب تاريخ الحفل)">
        <MonthlyChart data={chart} />
      </Card>
    </div>
  );
}
