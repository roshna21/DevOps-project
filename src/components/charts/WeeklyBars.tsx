'use client';

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type WeeklyBarsProps = {
  data: Array<{ week: string; attended: number; held: number; percentage: number }>;
};

export function WeeklyBars({ data }: WeeklyBarsProps) {
  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={20}>
          <CartesianGrid vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            formatter={(value: number, name) => {
              if (name === "percentage") return [`${value}%`, "Attendance"];
              return value;
            }}
            labelFormatter={(label: string, payload) => {
              if (!payload || payload.length === 0) return label;
              const p = payload[0].payload as any;
              return `${label} — ${p.attended}/${p.held} (${p.percentage}%)`;
            }}
            contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }}
          />
          <Bar dataKey="percentage" fill="#64748b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


