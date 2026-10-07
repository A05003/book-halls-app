import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { computeBookingTotals } from "./finance";

export const bookingInclude = {
  client: true,
  hall: true,
  createdBy: { select: { name: true } },
  baseExpenses: { orderBy: { sortOrder: "asc" as const } },
  extras: { orderBy: { sortOrder: "asc" as const } },
  coordination: { include: { expenses: { orderBy: { sortOrder: "asc" as const } } } },
  payments: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.BookingInclude;

export type BookingFull = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export const totalsOf = (b: BookingFull) =>
  computeBookingTotals({
    rentalAmount: b.rentalAmount,
    baseExpenses: b.baseExpenses,
    extras: b.extras,
    coordination: b.coordination,
    payments: b.payments,
  });

export const getBooking = (id: number) =>
  prisma.booking.findUnique({ where: { id }, include: bookingInclude });

export type BookingFilter = {
  hallId?: number;
  status?: "TENTATIVE" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  from?: Date;
  to?: Date;
  q?: string;
};

export function listBookings(f: BookingFilter) {
  const where: Prisma.BookingWhereInput = {
    ...(f.hallId ? { hallId: f.hallId } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.from || f.to ? { gregorianDate: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {}),
    ...(f.q
      ? {
          OR: [
            { contractNumber: { contains: f.q, mode: "insensitive" } },
            { client: { name: { contains: f.q, mode: "insensitive" } } },
            { client: { phone: { contains: f.q } } },
          ],
        }
      : {}),
  };
  return prisma.booking.findMany({ where, include: bookingInclude, orderBy: { gregorianDate: "asc" } });
}

export const listHalls = () => prisma.hall.findMany({ orderBy: { id: "asc" } });
