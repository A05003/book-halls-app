import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { bookingInclude, totalsOf } from "@/lib/queries";
import { toGregorianLabel, toHijri } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";
import { KIND_LABEL, METHOD_LABEL } from "@/components/ui";

// سند القبض يحمل اسم وهوية الجهة المرتبطة به: ليالي الديار أو زوايا المعالي
const BRAND = {
  HALL: { color: "#110f43", mark: "ل", sub: "إيجار القاعة" },
  COORDINATION: { color: "#9a3b6b", mark: "ز", sub: "التنسيق والضيافة" },
} as const;

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const p = await prisma.payment.findUnique({
    where: { id: Number((await params).id) },
    include: { booking: { include: bookingInclude } },
  });
  if (!p || p.status === "VOID") notFound();
  const brand = BRAND[p.receiptKind];
  const t = totalsOf(p.booking);
  const left = p.receiptKind === "HALL" ? t.hallRemaining : t.coordinationRemaining;

  return (
    <div className="grid gap-3">
      <div className="no-print"><PrintButton /></div>
      <article className="print-sheet mx-auto w-full max-w-2xl rounded-lg border border-line bg-white p-8 text-black shadow-sm" style={{ borderTop: `8px solid ${brand.color}` }}>
        <header className="mb-5 flex items-center justify-between border-b-2 border-neutral-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl text-xl font-extrabold text-white" style={{ background: brand.color }}>{brand.mark}</div>
            <div><h1 className="text-xl font-extrabold">{KIND_LABEL[p.receiptKind]}</h1><p className="text-sm text-neutral-600">{brand.sub}</p></div>
          </div>
          <div className="text-end text-sm"><b className="text-base">سند قبض</b><br />{p.receiptNumber}<br />{toGregorianLabel(p.paymentDate)} · {toHijri(p.paymentDate)}</div>
        </header>
        <p className="leading-8">
          استلمنا من السيد/ة <b>{p.booking.client.name}</b><br />
          مبلغ وقدره <b>{formatMoney(p.amount)}</b> · طريقة الدفع: <b>{METHOD_LABEL[p.method]}</b><br />
          وذلك عن عقد <b>{p.receiptKind === "HALL" ? p.booking.contractNumber : p.booking.coordination?.coordinationContractNo}</b> بتاريخ حفل {toGregorianLabel(p.booking.gregorianDate)}<br />
          المتبقي بعد هذا السند: <b>{formatMoney(left)}</b>
        </p>
        <footer className="mt-12 flex justify-between text-sm"><span>المستلم</span><span>ختم الجهة</span></footer>
      </article>
    </div>
  );
}
