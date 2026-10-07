import { describe, it, expect } from "vitest";
import { computeBookingTotals, netOf, isOverpayment, maxPayable } from "@/lib/finance";
import { sumMoney, toHalalas } from "@/lib/money";

const base = {
  rentalAmount: "10000",
  baseExpenses: [{ amount: "1000" }, { amount: "500.50" }],
  extras: [
    { chargedAmount: "600", costAmount: "400" },
    { chargedAmount: "250.25", costAmount: "100.10" },
  ],
  coordination: { amount: "5000", expenses: [{ amount: "700" }, { amount: "300" }] },
  payments: [
    { amount: "4000", receiptKind: "HALL" as const, status: "ACTIVE" as const },
    { amount: "1000", receiptKind: "COORDINATION" as const, status: "ACTIVE" as const },
    { amount: "9999", receiptKind: "HALL" as const, status: "VOID" as const },
  ],
};

describe("المبالغ", () => {
  it("لا تظهر أخطاء الفاصلة العائمة", () => {
    expect(sumMoney(["0.1", "0.2"])).toBe(0.3);
    expect(toHalalas("19.99")).toBe(1999);
  });
});

describe("الحسابات التلقائية", () => {
  it("الصافي = المبلغ - الصرف", () => {
    expect(netOf("600", "400")).toBe(200);
    expect(netOf("250.25", "100.10")).toBe(150.15);
  });

  it("المتبقي = (العقد + التنسيق + الزيادات) - المدفوع، والسند الملغى لا يُحسب", () => {
    const t = computeBookingTotals(base);
    expect(t.extrasCharged).toBe(850.25);
    expect(t.totalRevenue).toBe(15850.25);
    expect(t.totalPaid).toBe(5000);
    expect(t.remaining).toBe(10850.25);
  });

  it("صافي الربح = الإيرادات - كل المصاريف (المرفق والتنسيق والصرف)", () => {
    const t = computeBookingTotals(base);
    expect(t.baseExpenses).toBe(1500.5);
    expect(t.extrasCost).toBe(500.1);
    expect(t.coordinationExpenses).toBe(1000);
    expect(t.totalExpenses).toBe(3000.6);
    expect(t.netProfit).toBe(12849.65);
    expect(t.coordinationNet).toBe(4000);
    expect(t.rentalNet).toBe(8499.5);
  });

  it("المتبقي لكل جهة منفصل، ولا يتجاوز السند المتبقي", () => {
    const t = computeBookingTotals(base);
    expect(t.hallRemaining).toBe(6850.25);
    expect(t.coordinationRemaining).toBe(4000);
    expect(maxPayable(t, "HALL")).toBe(6850.25);
    expect(isOverpayment("4000.01", 4000)).toBe(true);
    expect(isOverpayment("4000", 4000)).toBe(false);
  });

  it("حجز بلا تنسيق ولا بنود", () => {
    const t = computeBookingTotals({
      rentalAmount: 8000,
      baseExpenses: [],
      extras: [],
      coordination: null,
      payments: [],
    });
    expect(t.remaining).toBe(8000);
    expect(t.netProfit).toBe(8000);
    expect(t.coordinationNet).toBe(0);
  });
});
