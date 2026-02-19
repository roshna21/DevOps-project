 'use client';

import React from "react";
import { Button } from "./Button";
import { twMerge } from "tailwind-merge";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  React.useEffect(() => {
    if (open) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div
        className={twMerge(
          "pastel-card relative z-10 w-full max-h-[90vh] overflow-auto",
          size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl"
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200/60">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <Button aria-label="Close" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200/60">{footer}</div>}
      </div>
    </div>
  );
}

