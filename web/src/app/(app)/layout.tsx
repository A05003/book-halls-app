import Link from "next/link";
import { requireUser } from "@/lib/session";
import { can, ROLE_LABEL } from "@/lib/rbac";
import { logoutAction } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = [
    { href: "/calendar", label: "التقويم", show: true },
    { href: "/bookings", label: "الحجوزات", show: true },
    { href: "/dashboard", label: "التقارير المالية", show: can(user.role, "report:view") },
  ].filter((n) => n.show);

  return (
    <div className="grid min-h-screen md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="no-print flex flex-wrap items-center gap-2 bg-navy p-3 text-white md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:p-4">
        <div className="mb-0 flex items-center gap-3 md:mb-4 md:border-b md:border-white/15 md:pb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-gold text-lg font-extrabold text-navy">ق</div>
          <div className="text-sm font-bold leading-tight">ليالي الديار<br />وزوايا المعالي</div>
        </div>
        <nav className="flex flex-wrap gap-1 md:flex-col" aria-label="القائمة الرئيسية">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto text-xs md:ms-0 md:mt-auto">
          <div className="mb-2 text-white/70">
            {user.name} · {ROLE_LABEL[user.role]}
          </div>
          <form action={logoutAction}>
            <button className="w-full cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20">خروج</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-5 md:px-8">{children}</main>
    </div>
  );
}
