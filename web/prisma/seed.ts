import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 8) throw new Error("SEED_ADMIN_PASSWORD مطلوب (8 أحرف على الأقل)");
  const hash = await bcrypt.hash(password, 12);

  await prisma.hall.upsert({
    where: { name: "قاعة ليالي الديار" },
    create: { name: "قاعة ليالي الديار" },
    update: {},
  });

  const users: { username: string; name: string; role: Role }[] = [
    { username: "manager", name: "مدير القاعة", role: "MANAGER" },
  ];
  // حسابات التجربة لبقية الأدوار لا تُنشأ في الإنتاج
  if (process.env.NODE_ENV !== "production") {
    users.push(
      { username: "accountant", name: "محاسب", role: "ACCOUNTANT" },
      { username: "reception", name: "موظف استقبال", role: "RECEPTION" },
      { username: "coordinator", name: "مشرفة التنسيق", role: "COORDINATOR" },
    );
  }
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      create: { ...u, passwordHash: hash },
      update: {},
    });
  }
  console.log(`تمت التهيئة: ${users.length} مستخدم وقاعة واحدة`);
}

main().finally(() => prisma.$disconnect());
