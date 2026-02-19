 'use client';

import React from "react";
import { twMerge } from "tailwind-merge";

type RoleToggleProps = {
  value: "parent" | "professor";
  onChange: (v: "parent" | "professor") => void;
};

export function RoleToggle({ value, onChange }: RoleToggleProps) {
  const isParent = value === "parent";
  return (
    <div className="relative w-full max-w-xs mx-auto">
      <div className="grid grid-cols-2 gap-0 rounded-2xl border border-slate-200 bg-white p-1 shadow-soft">
        <button
          type="button"
          onClick={() => onChange("parent")}
          className={twMerge(
            "relative z-10 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            isParent ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
          aria-pressed={isParent}
          aria-label="Parent"
        >
          Parent
        </button>
        <button
          type="button"
          onClick={() => onChange("professor")}
          className={twMerge(
            "relative z-10 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            !isParent ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
          aria-pressed={!isParent}
          aria-label="Professor"
        >
          Professor
        </button>
      </div>
      <div
        aria-hidden="true"
        className={twMerge(
          "absolute top-1 bottom-1 w-1/2 rounded-xl bg-pastelLavender transition-transform duration-300 ease-out shadow-soft",
          isParent ? "translate-x-0" : "translate-x-full"
        )}
      />
    </div>
  );
}

