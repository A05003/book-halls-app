# نظام إدارة القاعات (Hall ERP)

تطبيق ويب عربي (RTL) لإدارة حجوزات ومصاريف قاعات الأفراح، يحوّل ملفات Excel إلى قاعدة بيانات مترابطة.

## التقنيات
- **الواجهة والخادم:** Next.js 15 (App Router وServer Actions) وReact 19 وTypeScript وTailwind CSS 4، بخط Cairo.
- **قاعدة البيانات:** PostgreSQL مع Prisma 6 (المخطط في `prisma/schema.prisma`).
- **التحقق:** Zod. **الجلسات:** JWT (jose) في كوكي HttpOnly. **كلمات المرور:** bcrypt.
- **الرسوم:** Recharts. **الاختبارات:** Vitest.

## التشغيل
```bash
cp .env.example .env        # عدّل DATABASE_URL وSESSION_SECRET وSEED_ADMIN_PASSWORD
npm install
npx prisma migrate deploy   # أو: npm run db:migrate في التطوير
npm run db:seed             # القاعة ومدير النظام (وحسابات الأدوار خارج الإنتاج)
npm run dev
```
حسابات التجربة (خارج الإنتاج) بكلمة مرور `SEED_ADMIN_PASSWORD`: `manager` و`accountant` و`reception` و`coordinator`.

## الهيكل
```
prisma/            المخطط والترحيلات والتهيئة
src/lib/           المنطق: finance (الحسابات) rbac (الصلاحيات) sections (تعارض الأقسام)
                   dates (هجري/ميلادي) money (هللات) queries session audit sequence validators
src/app/actions.ts كل عمليات الكتابة (تحقق صلاحية + Zod + معاملة + سجل تدقيق)
src/app/(app)/     calendar · bookings · bookings/[id] (بطاقة الحفل) · dashboard · print · receipt
tests/             اختبارات الحسابات والصلاحيات والتواريخ
```

## قواعد العمل المطبقة
- الصافي = المبلغ − الصرف. المتبقي = (العقد + الزيادات + التنسيق) − المدفوع. صافي الربح = الإيرادات − كل المصاريف.
- المبالغ تُحسب بالهللات لتجنب أخطاء الفاصلة العائمة، ولا يُخزَّن أي مبلغ مشتق.
- لا يُحجز قسمان متعارضان في القاعة واليوم نفسه (رجال ونساء في يوم واحد مسموح). الفحص داخل معاملة Serializable.
- السند لا يتجاوز المتبقي على جهته (ليالي الديار أو زوايا المعالي)، ولا يُحذف بل يُلغى.
- الصلاحيات تُفحص على الخادم في كل إجراء، وكل تغيير يُسجَّل في `AuditLog`.
