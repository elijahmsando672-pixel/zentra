"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate, formatCompactKES } from "@/lib/utils";
import type { PortfolioPoint } from "@/lib/types";

const DARK_TOOLTIP = {
  borderRadius: 12,
  border: "1px solid #1e3050",
  background: "#101d31",
  color: "#e9eff8",
  fontSize: 12,
  boxShadow: "0 10px 30px rgba(7,20,38,.25)",
} as const;

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[#1e3050] bg-[#101d31] px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-white/70">{formatShortDate(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="numeric flex items-center gap-2 font-bold text-white">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatCompactKES(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function PortfolioChart({
  data,
  height = 280,
  className,
}: {
  data: PortfolioPoint[];
  height?: number;
  className?: string;
}) {
  const chartData = data.map((p) => ({
    date: p.date,
    portfolio: p.portfolio,
    earnings: p.earnings,
    invested: p.invested,
  }));

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8f24a" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#c8f24a" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="investedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatShortDate(v)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={36}
          />
          <YAxis
            tickFormatter={(v) => formatCompactKES(v)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--color-border)" }} />
          <Area
            type="monotone"
            dataKey="invested"
            name="Invested"
            stroke="#3b82f6"
            strokeWidth={1.75}
            fill="url(#investedFill)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="portfolio"
            name="Portfolio"
            stroke="#071426"
            strokeWidth={2.25}
            fill="url(#portfolioFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EarningsBarChart({
  data,
  height = 240,
  className,
  color = "#18b97a",
  valueFormatter = (v: number) => formatCompactKES(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`barFill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={valueFormatter}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            content={({ active, payload, label }: any) =>
              active && payload?.length ? (
                <div className="rounded-md border border-[#1e3050] bg-[#101d31] px-3.5 py-2.5 text-xs shadow-lg">
                  <p className="mb-1 font-semibold text-white/70">{label}</p>
                  <p className="numeric font-bold text-white">{valueFormatter(payload[0].value)}</p>
                </div>
              ) : null
            }
            cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#barFill-${color.replace("#", "")})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleLineChart({
  data,
  height = 220,
  className,
  color = "#071426",
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  color?: string;
}) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`line-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v) => formatCompactKES(v)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            content={({ active, payload, label }: any) =>
              active && payload?.length ? (
                <div className="rounded-md border border-[#1e3050] bg-[#101d31] px-3.5 py-2.5 text-xs shadow-lg">
                  <p className="mb-1 font-semibold text-white/70">{label}</p>
                  <p className="numeric font-bold text-white">{formatCompactKES(payload[0].value)}</p>
                </div>
              ) : null
            }
            cursor={{ stroke: "var(--color-border)" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#line-${color.replace("#", "")})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
