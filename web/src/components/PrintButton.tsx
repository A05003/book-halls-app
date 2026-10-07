"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print cursor-pointer rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">
      طباعة / حفظ PDF
    </button>
  );
}
