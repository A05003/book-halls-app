import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function audit(
  tx: Tx,
  userId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  detail?: Prisma.InputJsonValue,
): Promise<void> {
  await tx.auditLog.create({ data: { userId, action, entity, entityId, detail } });
}
