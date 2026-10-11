"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompactKES, formatKES } from "@/lib/utils";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function WalletDonut({
  data,
  size = 200,
  className,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  return (
    <div className={className} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="label"
            innerRadius="68%"
            outerRadius="94%"
            paddingAngle={2}
            stroke="none"
          >
            {filtered.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              return (
                <div className="rounded-md border border-[#1e3050] bg-[#101d31] px-3.5 py-2.5 text-xs shadow-lg">
                  <p className="font-semibold text-white/70">{item.name}</p>
                  <p className="numeric font-bold text-white">{formatKES(item.value)}</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none -mt-[calc(50%+18px)] flex h-0 flex-col items-center justify-center">
          {centerValue && <p className="numeric text-sm font-extrabold">{centerValue}</p>}
          {centerLabel && <p className="text-[11px] text-muted-foreground">{centerLabel}</p>}
        </div>
      )}
    </div>
  );
}

export function WalletLegend({ data, total }: { data: DonutSlice[]; total: number }) {
  return (
    <ul className="space-y-2.5">
      {data.map((slice) => {
        const pct = total > 0 ? (slice.value / total) * 100 : 0;
        return (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="truncate text-muted-foreground">{slice.label}</span>
            </span>
            <span className="numeric shrink-0 font-bold">{formatCompactKES(slice.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
