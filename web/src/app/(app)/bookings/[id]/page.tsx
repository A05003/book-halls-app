import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getBooking, totalsOf } from "@/lib/queries";
import { netOf } from "@/lib/finance";
import { SECTION_LABEL } from "@/lib/sections";
import { toGregorianLabel, toISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  addBaseExpenseAction,
  addCoordinationExpenseAction,
  addExtraAction,
  addPaymentAction,
  removeBaseExpenseAction,
  removeCoordinationExpenseAction,
  removeExtraAction,
  saveCoordinationAction,
  saveNotesAction,
  setStatusAction,
  voidPaymentAction,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { RowDelete } from "@/components/RowDelete";
import { Btn, Card, Field, KIND_LABEL, METHOD_LABEL, StatusTag, Tag, inputCls } from "@/components/ui";

const th = "border border-line bg-soft p-2 text-start text-xs font-bold";
const td = "border border-line p-2";
const num = "border border-line p-2 text-start tabular-nums";
const totalRow = "bg-yel font-bold text-ink";
const netRow = "bg-blue font-bold text-white";

function Sum({ label, value, hl }: { label: string; value: string; hl?: boolean }) {
  return (
    <div className="min-w-0 border border-line">
      <div className="bg-blue px-3 py-1 text-xs font-bold text-white">{label}</div>
      <div className={`px-3 py-1.5 text-lg font-extrabold ${hl ? "bg-yel text-ink" : "bg-surface"}`}>{value}</div>
    </div>
  );
}

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const bid = Number(id);
  if (!Number.isInteger(bid)) notFound();
  const b = await getBooking(bid);
  if (!b) notFound();

  const t = totalsOf(b);
  const r = user.role;
  const open = b.status === "TENTATIVE" || b.status === "CONFIRMED";
  const canBase = open && can(r, "baseExpense:edit");
  const canExtra = open && can(r, "extra:edit");
  const canCoord = open && can(r, "coordination:edit") && b.sectionType !== "MEN_ONLY";
  const canPay = b.status !== "CANCELLED" && can(r, "payment:create");
  const seeMoney = can(r, "payment:create") || can(r, "report:view") || can(r, "coordination:edit");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">بطاقة الحفل · {b.contractNumber}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bookings/${b.id}/print`} className="rounded-lg bg-soft px-4 py-2 text-sm font-bold">ملخص العقد للطباعة</Link>
          <Link href="/calendar" className="rounded-lg bg-soft px-4 py-2 text-sm font-bold">رجوع للتقويم</Link>
        </div>
      </div>

      {/* البيانات الأساسية */}
      <Card
        title="البيانات الأساسية"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status={b.status} />
            {open && can(r, "booking:update") && b.status === "TENTATIVE" && (
              <ActionForm action={setStatusAction} className="inline" resetOnSuccess={false}>
                <input type="hidden" name="id" value={b.id} /><input type="hidden" name="target" value="CONFIRMED" />
                <Btn type="submit">تأكيد الحجز</Btn>
              </ActionForm>
            )}
            {open && can(r, "booking:update") && b.status === "CONFIRMED" && (
              <ActionForm action={setStatusAction} className="inline" resetOnSuccess={false}>
                <input type="hidden" name="id" value={b.id} /><input type="hidden" name="target" value="COMPLETED" />
                <Btn type="submit">إنهاء الحفل</Btn>
              </ActionForm>
            )}
            {open && can(r, "booking:cancel") && (
              <ActionForm action={setStatusAction} className="inline" resetOnSuccess={false}>
                <input type="hidden" name="id" value={b.id} /><input type="hidden" name="target" value="CANCELLED" />
                <Btn type="submit" variant="danger">إلغاء الحجز</Btn>
              </ActionForm>
            )}
          </div>
        }
      >
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["العميل", b.client.name],
            ["الجوال", b.client.phone],
            ["رقم العقد", b.contractNumber],
            ["القاعة", b.hall.name],
            ["التاريخ الميلادي", toGregorianLabel(b.gregorianDate)],
            ["التاريخ الهجري", b.hijriDate],
            ["نوع الحجز", SECTION_LABEL[b.sectionType]],
            ["أنشأه", b.createdBy.name],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2"><dt className="font-semibold text-muted">{k}:</dt><dd className="font-bold" dir="auto">{v}</dd></div>
          ))}
        </dl>
      </Card>

      {seeMoney && (
        <div className="grid grid-cols-2 gap-0 md:grid-cols-5">
          <Sum label="إجمالي الإيراد" value={formatMoney(t.totalRevenue)} />
          <Sum label="إجمالي المصاريف" value={formatMoney(t.totalExpenses)} />
          <Sum label="المحصّل" value={formatMoney(t.totalPaid)} />
          <Sum label="المتبقي على العميل" value={b.status === "CANCELLED" ? "—" : formatMoney(t.remaining)} />
          <Sum label="صافي ربح الحفل" value={formatMoney(t.netProfit)} hl />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* العقد والخدمات الأساسية */}
        <Card title="بيان عقد الإيجار">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr><td className={td}>مبلغ العقد</td><td className={num}>{formatMoney(t.rental)}</td><td className={td} /></tr>
                <tr className={totalRow}><td className={td} colSpan={3}>مصاريف عقد الإيجار</td></tr>
                {b.baseExpenses.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>{e.name}</td><td className={num}>{formatMoney(e.amount)}</td>
                    <td className={`${td} no-print`}>{canBase && <RowDelete action={removeBaseExpenseAction} id={e.id} />}</td>
                  </tr>
                ))}
                <tr className={totalRow}><td className={td}>إجمالي مصاريف العقد</td><td className={num}>{formatMoney(t.baseExpenses)}</td><td className={td} /></tr>
                <tr className={netRow}><td className={td}>الصافي</td><td className={num}>{formatMoney(t.rentalNet)}</td><td className={td} /></tr>
              </tbody>
            </table>
          </div>
          {canBase && (
            <ActionForm action={addBaseExpenseAction} className="no-print mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="bookingId" value={b.id} />
              <input name="name" placeholder="البند" className={`${inputCls} flex-1`} required />
              <input name="amount" inputMode="decimal" placeholder="المبلغ" className={`${inputCls} w-28`} required />
              <Btn type="submit">إضافة</Btn>
            </ActionForm>
          )}
        </Card>

        {/* الزيادات */}
        <Card title="الزيادات">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className={th}>الخدمة</th><th className={th}>المبلغ</th><th className={th}>الصرف</th><th className={th}>الصافي</th><th className={th} /></tr></thead>
              <tbody>
                {b.extras.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>{e.serviceName}</td>
                    <td className={num}>{formatMoney(e.chargedAmount)}</td>
                    <td className={num}>{formatMoney(e.costAmount)}</td>
                    <td className={num}>{formatMoney(netOf(e.chargedAmount, e.costAmount))}</td>
                    <td className={`${td} no-print`}>{canExtra && <RowDelete action={removeExtraAction} id={e.id} />}</td>
                  </tr>
                ))}
                <tr className={totalRow}>
                  <td className={td}>الإجمالي</td><td className={num}>{formatMoney(t.extrasCharged)}</td>
                  <td className={num}>{formatMoney(t.extrasCost)}</td><td className={num}>{formatMoney(t.extrasNet)}</td><td className={td} />
                </tr>
              </tbody>
            </table>
          </div>
          {canExtra && (
            <ActionForm action={addExtraAction} className="no-print mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="bookingId" value={b.id} />
              <input name="serviceName" placeholder="الخدمة" className={`${inputCls} flex-1`} required />
              <input name="chargedAmount" inputMode="decimal" placeholder="المبلغ" className={`${inputCls} w-24`} required />
              <input name="costAmount" inputMode="decimal" placeholder="الصرف" defaultValue="0" className={`${inputCls} w-24`} />
              <Btn type="submit">إضافة</Btn>
            </ActionForm>
          )}
        </Card>

        {/* تنسيق النساء */}
        <Card title="تنسيق النساء · زوايا المعالي">
          {b.coordination ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className={td}>رقم عقد التنسيق</td><td className={num} colSpan={2}>{b.coordination.coordinationContractNo}</td></tr>
                    <tr><td className={td}>مبلغ التنسيق</td><td className={num}>{formatMoney(t.coordinationAmount)}</td><td className={td} /></tr>
                    <tr className={totalRow}><td className={td} colSpan={3}>المصروف</td></tr>
                    {b.coordination.expenses.map((e) => (
                      <tr key={e.id}>
                        <td className={td}>{e.name}</td><td className={num}>{formatMoney(e.amount)}</td>
                        <td className={`${td} no-print`}>{canCoord && <RowDelete action={removeCoordinationExpenseAction} id={e.id} />}</td>
                      </tr>
                    ))}
                    <tr className={totalRow}><td className={td}>إجمالي المصروف</td><td className={num}>{formatMoney(t.coordinationExpenses)}</td><td className={td} /></tr>
                    <tr className={netRow}><td className={td}>الصافي</td><td className={num}>{formatMoney(t.coordinationNet)}</td><td className={td} /></tr>
                  </tbody>
                </table>
              </div>
              {canCoord && (
                <>
                  <ActionForm action={addCoordinationExpenseAction} className="no-print mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <input name="name" placeholder="البند" className={`${inputCls} flex-1`} required />
                    <input name="amount" inputMode="decimal" placeholder="المبلغ" className={`${inputCls} w-28`} required />
                    <Btn type="submit">إضافة</Btn>
                  </ActionForm>
                  <ActionForm action={saveCoordinationAction} className="no-print mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3" resetOnSuccess={false}>
                    <input type="hidden" name="bookingId" value={b.id} />
                    <Field label="تعديل مبلغ التنسيق"><input name="amount" inputMode="decimal" defaultValue={b.coordination.amount.toString()} className={`${inputCls} w-32`} required /></Field>
                    <Btn type="submit" variant="ghost">حفظ</Btn>
                  </ActionForm>
                </>
              )}
            </>
          ) : canCoord ? (
            <ActionForm action={saveCoordinationAction} className="grid gap-2">
              <p className="text-sm text-muted">لا يوجد عقد تنسيق لهذا الحجز.</p>
              <input type="hidden" name="bookingId" value={b.id} />
              <input name="coordinationContractNo" placeholder="رقم عقد التنسيق (فارغ = تلقائي)" className={inputCls} />
              <input name="amount" inputMode="decimal" placeholder="مبلغ التنسيق" className={inputCls} required />
              <Btn type="submit">إنشاء عقد التنسيق</Btn>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">لا يوجد عقد تنسيق لهذا الحجز.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* المدفوعات */}
        <Card title="المدفوعات وتوزيع التحصيل">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className={th}>السند</th><th className={th}>الجهة</th><th className={th}>الدفع</th><th className={th}>التاريخ</th><th className={th}>المبلغ</th><th className={th} /></tr></thead>
              <tbody>
                {b.payments.map((p) => (
                  <tr key={p.id} className={p.status === "VOID" ? "text-muted line-through" : ""}>
                    <td className={td}>{p.receiptNumber}</td>
                    <td className={td}>{KIND_LABEL[p.receiptKind]}</td>
                    <td className={td}>{METHOD_LABEL[p.method]}</td>
                    <td className={td}>{toISODate(p.paymentDate)}</td>
                    <td className={num}>{formatMoney(p.amount)}</td>
                    <td className={`${td} no-print whitespace-nowrap`}>
                      {p.status === "ACTIVE" && <Link href={`/payments/${p.id}/receipt`} className="me-1 rounded bg-soft px-2 py-0.5 text-xs font-bold">سند</Link>}
                      {p.status === "ACTIVE" && can(r, "payment:void") && <RowDelete action={voidPaymentAction} id={p.id} label="إلغاء" />}
                      {p.status === "VOID" && <Tag tone="bd">ملغى</Tag>}
                    </td>
                  </tr>
                ))}
                <tr className={totalRow}><td className={td} colSpan={4}>إجمالي المحصّل</td><td className={num}>{formatMoney(t.totalPaid)}</td><td className={td} /></tr>
                <tr className={netRow}><td className={td} colSpan={4}>المتبقي على العميل</td><td className={num}>{b.status === "CANCELLED" ? "—" : formatMoney(t.remaining)}</td><td className={td} /></tr>
              </tbody>
            </table>
          </div>
          {canPay && (
            <ActionForm action={addPaymentAction} className="no-print mt-3 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="bookingId" value={b.id} />
              <Field label="سند باسم">
                <select name="receiptKind" className={inputCls} defaultValue="HALL">
                  <option value="HALL">قصر ليالي الديار (متبقي {formatMoney(t.hallRemaining)})</option>
                  {b.coordination && <option value="COORDINATION">شركة زوايا المعالي (متبقي {formatMoney(t.coordinationRemaining)})</option>}
                </select>
              </Field>
              <Field label="طريقة الدفع">
                <select name="method" className={inputCls} defaultValue="CASH">
                  <option value="CASH">كاش</option><option value="CARD">شبكة</option><option value="BANK_TRANSFER">تحويل بنكي</option>
                </select>
              </Field>
              <Field label="المبلغ"><input name="amount" inputMode="decimal" className={inputCls} required /></Field>
              <Field label="تاريخ الدفع"><input name="paymentDate" type="date" defaultValue={today} className={inputCls} required /></Field>
              <div className="sm:col-span-2"><Btn type="submit">تسجيل سند قبض</Btn></div>
            </ActionForm>
          )}
        </Card>

        {/* الملاحظات */}
        <Card title="الملاحظات وتوقيع الإدارة">
          {can(r, "booking:update") && b.status !== "CANCELLED" ? (
            <ActionForm action={saveNotesAction} className="grid gap-2" resetOnSuccess={false}>
              <input type="hidden" name="bookingId" value={b.id} />
              <textarea name="notes" defaultValue={b.notes ?? ""} rows={5} className={inputCls} placeholder="ملاحظات الحفل" />
              <div><Btn type="submit" variant="ghost">حفظ الملاحظات</Btn></div>
            </ActionForm>
          ) : (
            <p className="min-h-20 whitespace-pre-wrap text-sm">{b.notes || "—"}</p>
          )}
          <div className="mt-8 flex justify-between text-sm text-muted"><span>توقيع مدير القاعة</span><span>توقيع المحاسب</span></div>
        </Card>
      </div>
    </div>
  );
}
