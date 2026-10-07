"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type MonthPoint = { label: string; revenue: number; expenses: number };

const fmt = (v: unknown) => new Intl.NumberFormat("ar-SA-u-nu-latn").format(Number(v)) + " ر.س";

export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  if (data.length === 0) return <p className="p-6 text-center text-sm text-muted">لا توجد بيانات في هذه الفترة</p>;
  return (
    <div dir="ltr" className="h-72 w-full" role="img" aria-label="رسم بياني لإيرادات ومصروفات كل شهر">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e1d6" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "Cairo" }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)} width={48} />
          <Tooltip formatter={fmt} contentStyle={{ fontFamily: "Cairo", direction: "rtl" }} />
          <Legend wrapperStyle={{ fontFamily: "Cairo" }} />
          <Bar dataKey="revenue" name="الإيرادات" fill="#110f43" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="المصروفات" fill="#bfbb45" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
