import React from "react";
import { twMerge } from "tailwind-merge";

type PastelBadgeProps = {
  children: React.ReactNode;
  color?: "rose" | "lavender" | "mint" | "peach" | "sky" | "slate";
  className?: string;
};

export function PastelBadge({ children, color = "lavender", className }: PastelBadgeProps) {
  const colorClass =
    color === "rose"
      ? "bg-pastelRose text-rose-800"
      : color === "mint"
      ? "bg-pastelMint text-emerald-800"
      : color === "peach"
      ? "bg-pastelPeach text-amber-800"
      : color === "sky"
      ? "bg-pastelSky text-sky-900"
      : color === "slate"
      ? "bg-slate-100 text-slate-700"
      : "bg-pastelLavender text-indigo-900";
  return (
    <span className={twMerge("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", colorClass, className)}>
      {children}
    </span>
  );
}


