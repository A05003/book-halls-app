import Link from "next/link";
import type { ReactNode } from "react";

export const inputCls =
  "w-full min-w-0 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted/70";

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface p-4">
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Btn({ children, variant = "primary", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-navy text-white hover:opacity-90",
    ghost: "bg-soft text-ink hover:bg-line",
    danger: "bg-bad/10 text-bad hover:bg-bad/20",
  }[variant];
  return (
    <button {...p} className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${v} ${p.className ?? ""}`}>
      {children}
    </button>
  );
}

export function LinkBtn({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "ghost" }) {
  const v = variant === "primary" ? "bg-navy text-white" : "bg-soft text-ink";
  return (
    <Link href={href} className={`inline-block rounded-lg px-4 py-2 text-sm font-bold ${v}`}>
      {children}
    </Link>
  );
}

const TONES = { ok: "bg-good/15 text-good", wr: "bg-warn/15 text-warn", bd: "bg-bad/15 text-bad", n: "bg-soft text-muted", l: "bg-navy/10 text-navy", z: "bg-zawaya/15 text-zawaya" } as const;
export function Tag({ tone = "n", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone]}`}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-muted">
      {label}
      {children}
    </label>
  );
}

export const STATUS_LABEL = { TENTATIVE: "مبدئي", CONFIRMED: "مؤكد", COMPLETED: "منتهي", CANCELLED: "ملغي" } as const;
export const STATUS_TONE = { TENTATIVE: "wr", CONFIRMED: "ok", COMPLETED: "n", CANCELLED: "bd" } as const;
export const METHOD_LABEL = { CASH: "كاش", CARD: "شبكة", BANK_TRANSFER: "تحويل بنكي" } as const;
export const KIND_LABEL = { HALL: "قصر ليالي الديار", COORDINATION: "شركة زوايا المعالي" } as const;

export function StatusTag({ status }: { status: keyof typeof STATUS_LABEL }) {
  return <Tag tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Tag>;
}
