"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastKind = "success" | "info" | "warning" | "error";

export type ToastOptions = {
  /** Toasts with the same id replace each other instead of stacking (e.g. a toggled filter). */
  id?: string;
  /** Milliseconds before auto-dismiss. Defaults depend on the kind. */
  duration?: number;
  /** Optional one-click follow-up, e.g. "Show test sends". */
  action?: { label: string; onClick: () => void };
};

type ToastItem = {
  id: string;
  seq: number; // bumps when a toast with the same id is re-shown, so its timer restarts
  kind: ToastKind;
  message: string;
  duration: number;
  action?: ToastOptions["action"];
};

type ToastApi = {
  success: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
  warning: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 3000,
  info: 4500,
  warning: 6000,
  error: 6000,
};

function Icon({ kind }: { kind: ToastKind }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "success")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.7 2.7L16 9.5" />
      </svg>
    );
  if (kind === "warning")
    return (
      <svg {...common}>
        <path d="M12 3.5l9.5 16.5h-19z" />
        <path d="M12 10v4.5M12 17.4v.1" />
      </svg>
    );
  if (kind === "error")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2M12 7.9v.1" />
    </svg>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const { id, seq, duration } = toast;

  // Auto-dismiss; hovering/focusing the toast pauses the countdown so people
  // have time to read it or hit the action button.
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [paused, id, seq, duration, onDismiss]);

  const urgent = toast.kind === "error" || toast.kind === "warning";

  return (
    <div
      className={`toast ${toast.kind}`}
      role={urgent ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-icon">
        <Icon kind={toast.kind} />
      </span>
      <span className="toast-msg">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(id)}>
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, opts: ToastOptions = {}) => {
    const seq = ++counter.current;
    const item: ToastItem = {
      id: opts.id ?? `toast-${seq}`,
      seq,
      kind,
      message,
      duration: opts.duration ?? DEFAULT_DURATION[kind] + (opts.action ? 2000 : 0),
      action: opts.action,
    };
    setToasts((prev) => [...prev.filter((t) => t.id !== item.id), item].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      info: (m, o) => push("info", m, o),
      warning: (m, o) => push("warning", m, o),
      error: (m, o) => push("error", m, o),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-label="Notifications">
        {toasts.map((t) => (
          <ToastView key={`${t.id}:${t.seq}`} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
