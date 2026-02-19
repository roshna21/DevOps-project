import React from "react";
import { twMerge } from "tailwind-merge";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string | React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...props },
  ref
) {
  const inputId = id || React.useId();
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={twMerge(
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:pastel-focus",
          error ? "border-rose-300 bg-pastelRose/50" : "",
          className
        )}
        {...props}
      />
      <div className="mt-1 min-h-5 text-sm">
        {error ? <span className="text-rose-500">{error}</span> : hint ? <span className="text-slate-500">{hint}</span> : null}
      </div>
    </div>
  );
});


