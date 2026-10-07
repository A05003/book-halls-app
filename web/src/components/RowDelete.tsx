"use client";

import type { ActionResult } from "@/lib/action-result";
import { ActionForm } from "./ActionForm";

export function RowDelete({ action, id, label = "حذف" }: { action: (fd: FormData) => Promise<ActionResult>; id: number; label?: string }) {
  return (
    <ActionForm action={action} className="inline" resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <button className="cursor-pointer rounded bg-bad/10 px-2 py-0.5 text-xs font-bold text-bad hover:bg-bad/20">{label}</button>
    </ActionForm>
  );
}
