// المبالغ تُحسب بالهللات (أعداد صحيحة) لتجنب أخطاء الفاصلة العائمة، وتُعرض بالريال.
export type MoneyInput = number | string | { toString(): string };

export function toHalalas(v: MoneyInput): number {
  const n = Number(v.toString());
  if (!Number.isFinite(n)) throw new Error("مبلغ غير صالح");
  return Math.round(n * 100);
}

export const fromHalalas = (h: number): number => h / 100;

export function sumMoney(values: MoneyInput[]): number {
  return fromHalalas(values.reduce<number>((s, v) => s + toHalalas(v), 0));
}

export const subMoney = (a: MoneyInput, b: MoneyInput): number =>
  fromHalalas(toHalalas(a) - toHalalas(b));

const nf = new Intl.NumberFormat("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });
export const formatMoney = (v: MoneyInput): string => `${nf.format(Number(v.toString()))} ر.س`;
