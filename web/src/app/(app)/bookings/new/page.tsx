import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listHalls } from "@/lib/queries";
import { createBookingAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Btn, Card, Field, inputCls } from "@/components/ui";

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ date?: string; hall?: string }> }) {
  const user = await requireUser();
  if (!can(user.role, "booking:create")) redirect("/calendar");
  const sp = await searchParams;
  const halls = await listHalls();

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="text-2xl font-extrabold">حجز جديد</h1>
      <Card>
        <ActionForm action={createBookingAction} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
          <h2 className="sm:col-span-2 text-sm font-bold text-muted">بيانات العميل</h2>
          <Field label="اسم العميل"><input name="clientName" className={inputCls} required /></Field>
          <Field label="رقم الجوال"><input name="phone" inputMode="tel" dir="ltr" className={`${inputCls} text-end`} required /></Field>
          <Field label="رقم الهوية (اختياري)"><input name="nationalId" inputMode="numeric" className={inputCls} /></Field>

          <h2 className="sm:col-span-2 mt-2 text-sm font-bold text-muted">بيانات الحجز</h2>
          <Field label="القاعة">
            <select name="hallId" defaultValue={sp.hall} className={inputCls} required>
              {halls.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}
            </select>
          </Field>
          <Field label="تاريخ الحفل (ميلادي)"><input name="date" type="date" defaultValue={sp.date} className={inputCls} required /></Field>
          <Field label="نوع الحجز">
            <select name="sectionType" className={inputCls} required defaultValue="BOTH">
              <option value="BOTH">قسمين</option>
              <option value="MEN_ONLY">رجال فقط</option>
              <option value="WOMEN_ONLY">نساء فقط</option>
            </select>
          </Field>
          <Field label="رقم العقد (اتركه فارغاً للترقيم التلقائي)"><input name="contractNumber" className={inputCls} /></Field>
          <Field label="مبلغ عقد الإيجار"><input name="rentalAmount" inputMode="decimal" className={inputCls} required /></Field>

          <h2 className="sm:col-span-2 mt-2 text-sm font-bold text-muted">عقد التنسيق (اختياري)</h2>
          <Field label="مبلغ التنسيق"><input name="coordinationAmount" inputMode="decimal" className={inputCls} /></Field>
          <Field label="رقم عقد التنسيق (فارغ = تلقائي)"><input name="coordinationContractNo" className={inputCls} /></Field>

          <div className="sm:col-span-2"><Btn type="submit">إنشاء الحجز</Btn></div>
        </ActionForm>
      </Card>
    </div>
  );
}
