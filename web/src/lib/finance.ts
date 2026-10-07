import { sumMoney, subMoney, toHalalas, fromHalalas, type MoneyInput } from "./money";

// الصافي لأي بند = المبلغ - الصرف
export const netOf = (charged: MoneyInput, cost: MoneyInput): number => subMoney(charged, cost);

export type PaymentLite = {
  amount: MoneyInput;
  receiptKind: "HALL" | "COORDINATION";
  status: "ACTIVE" | "VOID";
};

export type BookingFinanceInput = {
  rentalAmount: MoneyInput;
  baseExpenses: { amount: MoneyInput }[];
  extras: { chargedAmount: MoneyInput; costAmount: MoneyInput }[];
  coordination: { amount: MoneyInput; expenses: { amount: MoneyInput }[] } | null;
  payments: PaymentLite[];
};

export type BookingTotals = {
  rental: number;
  baseExpenses: number;
  rentalNet: number; // مبلغ العقد - مصاريف العقد
  extrasCharged: number;
  extrasCost: number;
  extrasNet: number;
  coordinationAmount: number;
  coordinationExpenses: number;
  coordinationNet: number; // الإجمالي - المصروفات
  totalRevenue: number; // العقد + الزيادات + التنسيق
  totalExpenses: number; // مصاريف العقد + صرف الزيادات + مصروفات التنسيق
  netProfit: number; // الإيرادات - جميع المصاريف
  totalPaid: number;
  remaining: number; // (العقد + التنسيق + الزيادات) - المدفوع
  hallDue: number; // مستحق قصر ليالي الديار: العقد + الزيادات
  hallPaid: number;
  hallRemaining: number;
  coordinationPaid: number;
  coordinationRemaining: number;
};

export function computeBookingTotals(b: BookingFinanceInput): BookingTotals {
  const rental = sumMoney([b.rentalAmount]);
  const baseExpenses = sumMoney(b.baseExpenses.map((e) => e.amount));
  const extrasCharged = sumMoney(b.extras.map((e) => e.chargedAmount));
  const extrasCost = sumMoney(b.extras.map((e) => e.costAmount));
  const coordinationAmount = b.coordination ? sumMoney([b.coordination.amount]) : 0;
  const coordinationExpenses = b.coordination
    ? sumMoney(b.coordination.expenses.map((e) => e.amount))
    : 0;

  const active = b.payments.filter((p) => p.status === "ACTIVE");
  const totalPaid = sumMoney(active.map((p) => p.amount));
  const hallPaid = sumMoney(active.filter((p) => p.receiptKind === "HALL").map((p) => p.amount));
  const coordinationPaid = sumMoney(
    active.filter((p) => p.receiptKind === "COORDINATION").map((p) => p.amount),
  );

  const totalRevenue = sumMoney([rental, extrasCharged, coordinationAmount]);
  const totalExpenses = sumMoney([baseExpenses, extrasCost, coordinationExpenses]);
  const hallDue = sumMoney([rental, extrasCharged]);

  return {
    rental,
    baseExpenses,
    rentalNet: subMoney(rental, baseExpenses),
    extrasCharged,
    extrasCost,
    extrasNet: subMoney(extrasCharged, extrasCost),
    coordinationAmount,
    coordinationExpenses,
    coordinationNet: subMoney(coordinationAmount, coordinationExpenses),
    totalRevenue,
    totalExpenses,
    netProfit: subMoney(totalRevenue, totalExpenses),
    totalPaid,
    remaining: subMoney(totalRevenue, totalPaid),
    hallDue,
    hallPaid,
    hallRemaining: subMoney(hallDue, hallPaid),
    coordinationPaid,
    coordinationRemaining: subMoney(coordinationAmount, coordinationPaid),
  };
}

// يمنع سند قبض يتجاوز المتبقي على الجهة المرتبطة بالسند
export function maxPayable(totals: BookingTotals, kind: "HALL" | "COORDINATION"): number {
  return kind === "HALL" ? totals.hallRemaining : totals.coordinationRemaining;
}

export const isOverpayment = (amount: MoneyInput, max: number): boolean =>
  toHalalas(amount) > toHalalas(max);

export const halalasToRiyal = fromHalalas;
