// التاريخ الهجري بتقويم أم القرى عبر Intl، ويُخزَّن نصاً بجانب الميلادي.
const hijriFmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const gregFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// يقبل "YYYY-MM-DD" ويعيد تاريخاً عند منتصف النهار UTC لتفادي انزياح المنطقة الزمنية
export function parseDateOnly(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("تاريخ غير صالح");
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error("تاريخ غير صالح");
  return d;
}

export const toHijri = (d: Date): string => hijriFmt.format(d);
export const toGregorianLabel = (d: Date): string => gregFmt.format(d);
export const toISODate = (d: Date): string => d.toISOString().slice(0, 10);
