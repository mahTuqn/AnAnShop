"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const focusableSelector = [
  "a[href]", "button:not([disabled])", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Replacement primitive for the inline admin dialogs. It traps keyboard
 * focus, closes with Escape, locks page scrolling and restores trigger focus.
 */
export function AccessibleDialog({ open, title, onClose, children, footer, size = "md" }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(focusableSelector);
    (first ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const controls = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter((node) => !node.hidden && node.tabIndex !== -1);
      if (!controls.length) { event.preventDefault(); panel.focus(); return; }
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) { event.preventDefault(); lastControl.focus(); }
      else if (!event.shiftKey && document.activeElement === lastControl) { event.preventDefault(); firstControl.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${size === "lg" ? "max-w-3xl" : "max-w-lg"}`}>
      <div className="flex items-start justify-between gap-4"><h2 id={titleId} className="text-xl font-semibold">{title}</h2><button type="button" onClick={onClose} aria-label="Đóng hộp thoại" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200 text-xl">×</button></div>
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
    </div>
  </div>;
}

