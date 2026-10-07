import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getBooking, totalsOf } from "@/lib/queries";
import { SECTION_LABEL } from "@/lib/sections";
import { toGregorianLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";
import { STATUS_LABEL } from "@/components/ui";

const cell = "border border-neutral-300 p-2 text-start";

export default async function PrintBooking({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const b = await getBooking(Number((await params).id));
  if (!b) notFound();
  const t = totalsOf(b);

  return (
    <div className="grid gap-3">
      <div className="no-print"><PrintButton /></div>
      <article className="print-sheet mx-auto w-full max-w-3xl rounded-lg border border-line bg-white p-8 text-black shadow-sm">
        <header className="mb-5 flex items-center justify-between border-b-2 border-neutral-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-navy text-xl font-extrabold text-white">ل</div>
            <div><h1 className="text-xl font-extrabold">قصر ليالي الديار</h1><p className="text-sm text-neutral-600">ملخص عقد الحفل</p></div>
          </div>
          <div className="text-end text-sm"><b>{b.contractNumber}</b><br />{STATUS_LABEL[b.status]}</div>
        </header>
        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div>العميل: <b>{b.client.name}</b></div><div>الجوال: <b dir="ltr">{b.client.phone}</b></div>
          <div>القاعة: <b>{b.hall.name}</b></div><div>نوع الحجز: <b>{SECTION_LABEL[b.sectionType]}</b></div>
          <div>التاريخ الميلادي: <b>{toGregorianLabel(b.gregorianDate)}</b></div><div>التاريخ الهجري: <b>{b.hijriDate}</b></div>
        </dl>
        <table className="w-full border-collapse text-sm">
          <thead><tr><th className={`${cell} bg-neutral-100`}>البيان</th><th className={`${cell} bg-neutral-100`}>المبلغ</th></tr></thead>
          <tbody>
            <tr><td className={cell}>مبلغ عقد الإيجار</td><td className={cell}>{formatMoney(t.rental)}</td></tr>
            {b.extras.map((e) => (<tr key={e.id}><td className={cell}>زيادة: {e.serviceName}</td><td className={cell}>{formatMoney(e.chargedAmount)}</td></tr>))}
            {b.coordination && <tr><td className={cell}>عقد التنسيق {b.coordination.coordinationContractNo}</td><td className={cell}>{formatMoney(t.coordinationAmount)}</td></tr>}
            <tr className="font-bold"><td className={cell}>الإجمالي</td><td className={cell}>{formatMoney(t.totalRevenue)}</td></tr>
            <tr><td className={cell}>المدفوع</td><td className={cell}>{formatMoney(t.totalPaid)}</td></tr>
            <tr className="font-bold"><td className={cell}>المتبقي</td><td className={cell}>{formatMoney(t.remaining)}</td></tr>
          </tbody>
        </table>
        {b.notes && <p className="mt-4 whitespace-pre-wrap text-sm"><b>ملاحظات: </b>{b.notes}</p>}
        <footer className="mt-12 flex justify-between text-sm"><span>توقيع الطرف الأول</span><span>توقيع الطرف الثاني</span></footer>
      </article>
    </div>
  );
}
