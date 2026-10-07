import type { Prisma } from "@prisma/client";

// ترقيم متسلسل بلا فجوات وآمن مع الطلبات المتزامنة (increment ذري داخل المعاملة)
export async function nextNumber(
  tx: Prisma.TransactionClient,
  key: "contract" | "coordination" | "receiptHall" | "receiptCoordination",
): Promise<number> {
  const row = await tx.sequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

export const formatNumber = (prefix: string, n: number): string =>
  `${prefix}-${String(n).padStart(4, "0")}`;
