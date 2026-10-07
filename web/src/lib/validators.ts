import { z } from "zod";

const text = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} مطلوب`).max(max, `${label} طويل جداً`);

// مبلغ بخانتين عشريتين كحد أقصى
export const amount = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, `${label} غير صالح`)
    .refine((v) => Number(v) <= 10_000_000, `${label} كبير جداً`);

export const positiveAmount = (label: string) =>
  amount(label).refine((v) => Number(v) > 0, `${label} يجب أن يكون أكبر من صفر`);

const optionalText = z.string().trim().max(60).optional().transform((v) => v || undefined);
const optionalAmount = (label: string) =>
  z.string().trim().optional().transform((v) => v || undefined).pipe(amount(label).optional());

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صالح");
const id = z.coerce.number().int().positive();

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+?\d{9,15})$/, "رقم الجوال غير صالح"));

export const createBookingSchema = z.object({
  clientName: text("اسم العميل"),
  phone: phoneSchema,
  nationalId: optionalText,
  hallId: id,
  date: dateStr,
  sectionType: z.enum(["BOTH", "MEN_ONLY", "WOMEN_ONLY"], { message: "نوع الحجز مطلوب" }),
  rentalAmount: positiveAmount("مبلغ عقد الإيجار"),
  contractNumber: optionalText,
  coordinationAmount: optionalAmount("مبلغ التنسيق"),
  coordinationContractNo: optionalText,
});

export const lineSchema = z.object({
  bookingId: id,
  name: text("البند"),
  amount: positiveAmount("المبلغ"),
});

export const extraSchema = z.object({
  bookingId: id,
  serviceName: text("اسم الخدمة"),
  chargedAmount: positiveAmount("المبلغ"),
  costAmount: amount("الصرف").default("0"),
});

export const coordinationSchema = z.object({
  bookingId: id,
  coordinationContractNo: optionalText,
  amount: positiveAmount("مبلغ التنسيق"),
});

export const paymentSchema = z.object({
  bookingId: id,
  receiptKind: z.enum(["HALL", "COORDINATION"]),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER"], { message: "طريقة الدفع مطلوبة" }),
  amount: positiveAmount("المبلغ"),
  paymentDate: dateStr,
});

export const idSchema = z.object({ id });
export const notesSchema = z.object({ bookingId: id, notes: z.string().max(4000).default("") });
export const loginSchema = z.object({ username: text("اسم المستخدم", 40), password: text("كلمة المرور", 100) });
