import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { loginAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Btn, Field, inputCls } from "@/components/ui";

export default async function LoginPage() {
  if (await getUser()) redirect("/calendar");
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-sm place-items-center px-4">
      <div className="w-full rounded-2xl border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-gold text-xl font-extrabold text-navy">ق</div>
          <div>
            <h1 className="text-lg font-extrabold">نظام إدارة القاعات</h1>
            <p className="text-sm text-muted">تسجيل الدخول</p>
          </div>
        </div>
        <ActionForm action={loginAction} className="grid gap-3" resetOnSuccess={false}>
          <Field label="اسم المستخدم">
            <input name="username" className={inputCls} autoComplete="username" required />
          </Field>
          <Field label="كلمة المرور">
            <input name="password" type="password" className={inputCls} autoComplete="current-password" required />
          </Field>
          <Btn type="submit">دخول</Btn>
        </ActionForm>
      </div>
    </main>
  );
}
