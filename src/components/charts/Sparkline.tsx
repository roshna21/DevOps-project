 'use client';

import React from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SparklineProps = {
  data: Array<{ month: string; percentage: number }>;
};

export function Sparkline({ data }: SparklineProps) {
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="month" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }}
            labelFormatter={() => ""}
          />
          <Line type="monotone" dataKey="percentage" stroke="#6b7280" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

