"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: (fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
};

// نموذج يستدعي إجراء خادم ويعرض رسالة الخطأ أو النجاح داخل النموذج نفسه
export function ActionForm({ action, children, className, resetOnSuccess = true }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => action(fd),
    null,
  );
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state && !state.ok && (
        <p role="alert" className="basis-full text-sm font-semibold text-bad">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p role="status" className="basis-full text-sm font-semibold text-good">
          {state.message}
        </p>
      )}
    </form>
  );
}
