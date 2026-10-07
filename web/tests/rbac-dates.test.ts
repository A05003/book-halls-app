import { describe, it, expect } from "vitest";
import { can, assertCan, ForbiddenError } from "@/lib/rbac";
import { sectionsConflict } from "@/lib/sections";
import { parseDateOnly, toHijri, toISODate } from "@/lib/dates";

describe("الصلاحيات", () => {
  it("موظف الاستقبال: العميل والحجز والمدفوعات فقط", () => {
    expect(can("RECEPTION", "booking:create")).toBe(true);
    expect(can("RECEPTION", "payment:create")).toBe(true);
    expect(can("RECEPTION", "payment:void")).toBe(false);
    expect(can("RECEPTION", "coordination:edit")).toBe(false);
    expect(can("RECEPTION", "report:view")).toBe(false);
  });
  it("مشرفة التنسيق: كارت التنسيق فقط", () => {
    expect(can("COORDINATOR", "coordination:edit")).toBe(true);
    expect(can("COORDINATOR", "extra:edit")).toBe(false);
    expect(can("COORDINATOR", "payment:create")).toBe(false);
    expect(() => assertCan("COORDINATOR", "booking:create")).toThrow(ForbiddenError);
  });
  it("المدير والمحاسب: وصول كامل، وإدارة المستخدمين للمدير فقط", () => {
    expect(can("ACCOUNTANT", "report:view")).toBe(true);
    expect(can("ACCOUNTANT", "user:manage")).toBe(false);
    expect(can("MANAGER", "user:manage")).toBe(true);
  });
});

describe("تعارض الأقسام", () => {
  it("قسمين يتعارض مع أي قسم", () => {
    expect(sectionsConflict("BOTH", "MEN_ONLY")).toBe(true);
    expect(sectionsConflict("WOMEN_ONLY", "BOTH")).toBe(true);
  });
  it("رجال ونساء في اليوم نفسه لا يتعارضان", () => {
    expect(sectionsConflict("MEN_ONLY", "WOMEN_ONLY")).toBe(false);
    expect(sectionsConflict("MEN_ONLY", "MEN_ONLY")).toBe(true);
  });
});

describe("التواريخ", () => {
  it("يحوّل الميلادي إلى هجري أم القرى", () => {
    const d = parseDateOnly("2026-10-07");
    expect(toISODate(d)).toBe("2026-10-07");
    expect(toHijri(d)).toContain("1448");
  });
  it("يرفض تاريخاً غير صالح", () => {
    expect(() => parseDateOnly("2026-13-45")).toThrow();
    expect(() => parseDateOnly("غير")).toThrow();
  });
});
