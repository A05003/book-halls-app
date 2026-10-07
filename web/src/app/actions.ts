"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError, type ZodType } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { ForbiddenError, type Permission } from "@/lib/rbac";
import { createSession, destroySession, requirePermission, type SessionUser } from "@/lib/session";
import { sectionsConflict } from "@/lib/sections";
import { parseDateOnly, toHijri, toISODate } from "@/lib/dates";
import { formatNumber, nextNumber } from "@/lib/sequence";
import { computeBookingTotals, isOverpayment, maxPayable } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import {
  coordinationSchema,
  createBookingSchema,
  extraSchema,
  idSchema,
  lineSchema,
  loginSchema,
  notesSchema,
  paymentSchema,
} from "@/lib/validators";
import { bookingInclude, totalsOf } from "@/lib/queries";

class UserError extends Error {}
const fd2obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));

function parse<T>(schema: ZodType<T>, fd: FormData): T {
  const r = schema.safeParse(fd2obj(fd));
  if (!r.success) throw new UserError(r.error.issues[0]?.message ?? "بيانات غير صالحة");
  return r.data;
}

// يحوّل الأخطاء المتوقعة إلى رسائل عربية، ويُخفي تفاصيل الأخطاء غير المتوقعة
async function run<T>(fn: () => Promise<T>): Promise<{ r: T } | { err: ActionResult }> {
  try {
    return { r: await fn() };
  } catch (e) {
    if (e instanceof UserError) return { err: fail(e.message) };
    if (e instanceof ForbiddenError) return { err: fail(e.message) };
    if (e instanceof ZodError) return { err: fail(e.issues[0]?.message ?? "بيانات غير صالحة") };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { err: fail("القيمة مستخدمة من قبل (رقم مكرر)") };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034")
      return { err: fail("تعارض مع عملية أخرى متزامنة، أعد المحاولة") };
    console.error(e);
    return { err: fail("حدث خطأ غير متوقع، لم تُحفظ العملية") };
  }
}

async function mutate(perm: Permission, fd: FormData, fn: (u: SessionUser) => Promise<string | void>, paths: string[]): Promise<ActionResult> {
  const out = await run(async () => {
    const u = await requirePermission(perm);
    return fn(u);
  });
  if ("err" in out) return out.err;
  paths.forEach((p) => (p.includes("[") ? revalidatePath(p, "page") : revalidatePath(p)));
  return ok(out.r || undefined);
}

/* ---------------- الدخول ---------------- */

export async function loginAction(fd: FormData): Promise<ActionResult> {
  const out = await run(async () => {
    const { username, password } = parse(loginSchema, fd);
    const u = await prisma.user.findUnique({ where: { username } });
    // مقارنة ثابتة الزمن تقريباً حتى لو لم يوجد المستخدم
    const hash = u?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
    const good = await bcrypt.compare(password, hash);
    if (!u || !u.active || !good) throw new UserError("اسم المستخدم أو كلمة المرور غير صحيحة");
    await createSession(u.id);
    await audit(prisma, u.id, "login", "User", u.id);
  });
  if ("err" in out) return out.err;
  redirect("/calendar");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/* ---------------- الحجز ---------------- */

async function loadEditable(tx: Prisma.TransactionClient, id: number, opts: { allowCompleted?: boolean } = {}) {
  const b = await tx.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!b) throw new UserError("الحجز غير موجود");
  if (b.status === "CANCELLED") throw new UserError("الحجز ملغي ولا يمكن تعديله");
  if (b.status === "COMPLETED" && !opts.allowCompleted) throw new UserError("الحجز منتهٍ ولا يمكن تعديله");
  return b;
}

export async function createBookingAction(fd: FormData): Promise<ActionResult> {
  const out = await run(async () => {
    const user = await requirePermission("booking:create");
    const d = parse(createBookingSchema, fd);
    const date = parseDateOnly(d.date);
    const coordAmount = d.coordinationAmount ? Number(d.coordinationAmount) : 0;

    return prisma.$transaction(
      async (tx) => {
        const hall = await tx.hall.findUnique({ where: { id: d.hallId } });
        if (!hall) throw new UserError("القاعة غير موجودة");

        const same = await tx.booking.findMany({
          where: { hallId: d.hallId, gregorianDate: date, status: { not: "CANCELLED" } },
        });
        const clash = same.find((x) => sectionsConflict(x.sectionType, d.sectionType));
        if (clash) throw new UserError(`القاعة محجوزة في هذا التاريخ (عقد ${clash.contractNumber})`);

        const client = await tx.client.upsert({
          where: { phone: d.phone },
          create: { name: d.clientName, phone: d.phone, nationalId: d.nationalId },
          update: d.nationalId ? { nationalId: d.nationalId } : {},
        });

        const contractNumber = d.contractNumber ?? formatNumber("ع", await nextNumber(tx, "contract"));
        const booking = await tx.booking.create({
          data: {
            contractNumber,
            clientId: client.id,
            hallId: hall.id,
            gregorianDate: date,
            hijriDate: toHijri(date),
            sectionType: d.sectionType,
            rentalAmount: d.rentalAmount,
            createdById: user.id,
            ...(coordAmount > 0
              ? {
                  coordination: {
                    create: {
                      amount: d.coordinationAmount!,
                      coordinationContractNo:
                        d.coordinationContractNo ?? formatNumber("ف", await nextNumber(tx, "coordination")),
                    },
                  },
                }
              : {}),
          },
        });
        await audit(tx, user.id, "create", "Booking", booking.id, { contractNumber, date: toISODate(date) });
        return booking.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });
  if ("err" in out) return out.err;
  revalidatePath("/calendar");
  redirect(`/bookings/${out.r}`);
}

export async function setStatusAction(fd: FormData): Promise<ActionResult> {
  const target = String(fd.get("target"));
  const perm: Permission = target === "CANCELLED" ? "booking:cancel" : "booking:update";
  return mutate(perm, fd, async (u) => {
    const { id } = parse(idSchema, fd);
    await prisma.$transaction(async (tx) => {
      const b = await loadEditable(tx, id, { allowCompleted: false });
      if (target === "CONFIRMED") {
        if (b.status !== "TENTATIVE") throw new UserError("الحجز مؤكد مسبقاً");
      } else if (target === "COMPLETED") {
        if (b.status !== "CONFIRMED") throw new UserError("يجب تأكيد الحجز قبل إنهائه");
        const rem = totalsOf(b).remaining;
        if (rem > 0) throw new UserError(`لا يمكن إنهاء الحجز قبل سداد المتبقي (${formatMoney(rem)})`);
      } else if (target !== "CANCELLED") {
        throw new UserError("حالة غير صالحة");
      }
      await tx.booking.update({ where: { id }, data: { status: target as "CONFIRMED" | "COMPLETED" | "CANCELLED" } });
      await audit(tx, u.id, `status:${target}`, "Booking", id);
    });
  }, ["/calendar", "/bookings", `/bookings/${fd.get("id")}`]);
}

export async function saveNotesAction(fd: FormData): Promise<ActionResult> {
  return mutate("booking:update", fd, async (u) => {
    const d = parse(notesSchema, fd);
    await prisma.$transaction(async (tx) => {
      await loadEditable(tx, d.bookingId, { allowCompleted: true });
      await tx.booking.update({ where: { id: d.bookingId }, data: { notes: d.notes || null } });
      await audit(tx, u.id, "notes", "Booking", d.bookingId);
    });
    return "تم حفظ الملاحظات";
  }, [`/bookings/${fd.get("bookingId")}`]);
}

/* ---------------- مصاريف العقد ---------------- */

export async function addBaseExpenseAction(fd: FormData): Promise<ActionResult> {
  return mutate("baseExpense:edit", fd, async (u) => {
    const d = parse(lineSchema, fd);
    await prisma.$transaction(async (tx) => {
      const b = await loadEditable(tx, d.bookingId);
      const row = await tx.baseExpense.create({
        data: { bookingId: b.id, name: d.name, amount: d.amount, sortOrder: b.baseExpenses.length },
      });
      await audit(tx, u.id, "add", "BaseExpense", row.id, { name: d.name, amount: d.amount });
    });
  }, [`/bookings/${fd.get("bookingId")}`, "/dashboard"]);
}

export async function removeBaseExpenseAction(fd: FormData): Promise<ActionResult> {
  return mutate("baseExpense:edit", fd, async (u) => {
    const { id } = parse(idSchema, fd);
    await prisma.$transaction(async (tx) => {
      const row = await tx.baseExpense.findUnique({ where: { id } });
      if (!row) throw new UserError("البند غير موجود");
      await loadEditable(tx, row.bookingId);
      await tx.baseExpense.delete({ where: { id } });
      await audit(tx, u.id, "remove", "BaseExpense", id, { name: row.name, amount: row.amount.toString() });
    });
  }, ["/bookings/[id]", "/dashboard"]);
}

/* ---------------- الزيادات ---------------- */

export async function addExtraAction(fd: FormData): Promise<ActionResult> {
  return mutate("extra:edit", fd, async (u) => {
    const d = parse(extraSchema, fd);
    await prisma.$transaction(async (tx) => {
      const b = await loadEditable(tx, d.bookingId);
      const row = await tx.extraService.create({
        data: { bookingId: b.id, serviceName: d.serviceName, chargedAmount: d.chargedAmount, costAmount: d.costAmount, sortOrder: b.extras.length },
      });
      await audit(tx, u.id, "add", "ExtraService", row.id, { serviceName: d.serviceName, charged: d.chargedAmount, cost: d.costAmount });
    });
  }, [`/bookings/${fd.get("bookingId")}`, "/dashboard"]);
}

export async function removeExtraAction(fd: FormData): Promise<ActionResult> {
  return mutate("extra:edit", fd, async (u) => {
    const { id } = parse(idSchema, fd);
    await prisma.$transaction(async (tx) => {
      const row = await tx.extraService.findUnique({ where: { id } });
      if (!row) throw new UserError("البند غير موجود");
      const b = await loadEditable(tx, row.bookingId);
      // لا يُحذف بند يجعل المدفوع أكبر من المستحق
      const after = computeBookingTotals({
        rentalAmount: b.rentalAmount,
        baseExpenses: b.baseExpenses,
        extras: b.extras.filter((x) => x.id !== id),
        coordination: b.coordination,
        payments: b.payments,
      });
      if (after.hallRemaining < 0) throw new UserError("لا يمكن حذف البند: المدفوع سيتجاوز المستحق، ألغِ سنداً أولاً");
      await tx.extraService.delete({ where: { id } });
      await audit(tx, u.id, "remove", "ExtraService", id, { serviceName: row.serviceName });
    });
  }, ["/bookings/[id]", "/dashboard"]);
}

/* ---------------- تنسيق النساء ---------------- */

export async function saveCoordinationAction(fd: FormData): Promise<ActionResult> {
  return mutate("coordination:edit", fd, async (u) => {
    const d = parse(coordinationSchema, fd);
    await prisma.$transaction(async (tx) => {
      const b = await loadEditable(tx, d.bookingId);
      if (b.sectionType === "MEN_ONLY") throw new UserError("الحجز للرجال فقط ولا يقبل عقد تنسيق");
      if (b.coordination) {
        const t = totalsOf(b);
        if (Number(d.amount) < t.coordinationPaid) throw new UserError("المبلغ أقل من المدفوع على التنسيق");
        await tx.coordination.update({
          where: { id: b.coordination.id },
          data: { amount: d.amount, ...(d.coordinationContractNo ? { coordinationContractNo: d.coordinationContractNo } : {}) },
        });
      } else {
        await tx.coordination.create({
          data: {
            bookingId: b.id,
            amount: d.amount,
            coordinationContractNo: d.coordinationContractNo ?? formatNumber("ف", await nextNumber(tx, "coordination")),
          },
        });
      }
      await audit(tx, u.id, "save", "Coordination", b.id, { amount: d.amount });
    });
  }, [`/bookings/${fd.get("bookingId")}`, "/dashboard"]);
}

export async function addCoordinationExpenseAction(fd: FormData): Promise<ActionResult> {
  return mutate("coordination:edit", fd, async (u) => {
    const d = parse(lineSchema, fd);
    await prisma.$transaction(async (tx) => {
      const b = await loadEditable(tx, d.bookingId);
      if (!b.coordination) throw new UserError("لا يوجد عقد تنسيق لهذا الحجز");
      const row = await tx.coordinationExpense.create({
        data: { coordinationId: b.coordination.id, name: d.name, amount: d.amount, sortOrder: b.coordination.expenses.length },
      });
      await audit(tx, u.id, "add", "CoordinationExpense", row.id, { name: d.name, amount: d.amount });
    });
  }, [`/bookings/${fd.get("bookingId")}`, "/dashboard"]);
}

export async function removeCoordinationExpenseAction(fd: FormData): Promise<ActionResult> {
  return mutate("coordination:edit", fd, async (u) => {
    const { id } = parse(idSchema, fd);
    await prisma.$transaction(async (tx) => {
      const row = await tx.coordinationExpense.findUnique({ where: { id }, include: { coordination: true } });
      if (!row) throw new UserError("البند غير موجود");
      await loadEditable(tx, row.coordination.bookingId);
      await tx.coordinationExpense.delete({ where: { id } });
      await audit(tx, u.id, "remove", "CoordinationExpense", id, { name: row.name });
    });
  }, ["/bookings/[id]", "/dashboard"]);
}

/* ---------------- المدفوعات ---------------- */

export async function addPaymentAction(fd: FormData): Promise<ActionResult> {
  return mutate("payment:create", fd, async (u) => {
    const d = parse(paymentSchema, fd);
    const date = parseDateOnly(d.paymentDate);
    await prisma.$transaction(
      async (tx) => {
        const b = await loadEditable(tx, d.bookingId, { allowCompleted: true });
        if (d.receiptKind === "COORDINATION" && !b.coordination) throw new UserError("لا يوجد عقد تنسيق لهذا الحجز");
        const totals = computeBookingTotals({
          rentalAmount: b.rentalAmount, baseExpenses: b.baseExpenses, extras: b.extras, coordination: b.coordination, payments: b.payments,
        });
        const max = maxPayable(totals, d.receiptKind);
        if (isOverpayment(d.amount, max)) throw new UserError(`المبلغ أكبر من المتبقي (${formatMoney(max)})`);
        const key = d.receiptKind === "HALL" ? "receiptHall" : "receiptCoordination";
        const receiptNumber = formatNumber(d.receiptKind === "HALL" ? "ل" : "ز", await nextNumber(tx, key));
        const p = await tx.payment.create({
          data: { bookingId: b.id, receiptKind: d.receiptKind, method: d.method, amount: d.amount, receiptNumber, paymentDate: date, createdById: u.id },
        });
        await audit(tx, u.id, "create", "Payment", p.id, { receiptNumber, amount: d.amount });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }, [`/bookings/${fd.get("bookingId")}`, "/dashboard"]);
}

export async function voidPaymentAction(fd: FormData): Promise<ActionResult> {
  return mutate("payment:void", fd, async (u) => {
    const { id } = parse(idSchema, fd);
    await prisma.$transaction(async (tx) => {
      const p = await tx.payment.findUnique({ where: { id } });
      if (!p) throw new UserError("السند غير موجود");
      if (p.status === "VOID") throw new UserError("السند ملغى مسبقاً");
      await tx.payment.update({ where: { id }, data: { status: "VOID", voidedAt: new Date() } });
      await audit(tx, u.id, "void", "Payment", id, { receiptNumber: p.receiptNumber, amount: p.amount.toString() });
    });
  }, ["/bookings/[id]", "/dashboard"]);
}
