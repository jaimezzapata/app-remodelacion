"use client";

import React, { useState } from "react";
import { formatCOP } from "../lib/initial-data";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  slices: DonutSlice[];
  emptyText?: string;
}

export function DonutChart({
  title,
  slices,
  emptyText = "Sin valores registrados",
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const validSlices = slices.filter((s) => s.value > 0);
  const total = validSlices.reduce((acc, s) => acc + s.value, 0);

  const size = 200;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const activeSlice =
    activeIndex !== null && validSlices[activeIndex] ? validSlices[activeIndex] : null;

  const segments = validSlices.reduce<
    Array<DonutSlice & { dashLength: number; gapLength: number; offset: number; pct: number }>
  >((acc, slice) => {
    const prevUsed = acc.reduce((sum, item) => sum + item.dashLength + item.gapLength, 0);
    const pct = total > 0 ? slice.value / total : 0;
    const rawLength = pct * circumference;
    const gap = validSlices.length > 1 ? 3 : 0;
    const dashLength = Math.max(0, rawLength - gap);
    const gapLength = rawLength - dashLength;
    acc.push({
      ...slice,
      dashLength,
      gapLength,
      offset: -prevUsed,
      pct,
    });
    return acc;
  }, []);

  return (
    <div className="bg-white border border-[#E2E0DA] p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B6963]">
          {title}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-[#9E9B93]">
          {validSlices.length} {validSlices.length === 1 ? "rubro" : "rubros"}
        </span>
      </div>

      {total === 0 ? (
        <div className="py-12 text-center text-xs text-[#9E9B93]">{emptyText}</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* SVG Donut */}
          <div className="relative w-[184px] h-[184px] shrink-0 flex items-center justify-center">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full -rotate-90"
              role="img"
              aria-label={title}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#ECEAE4"
                strokeWidth={strokeWidth}
              />
              {segments.map((seg, idx) => {
                const isSelected = activeIndex === idx;
                const isDimmed = activeIndex !== null && !isSelected;
                return (
                  <circle
                    key={seg.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                    strokeDashoffset={seg.offset}
                    opacity={isDimmed ? 0.35 : 1}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={() => setActiveIndex(isSelected ? null : idx)}
                  />
                );
              })}
            </svg>

            {/* Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#6B6963] truncate max-w-[110px]">
                {activeSlice ? activeSlice.label : "Total"}
              </span>
              <span className="text-sm font-mono font-semibold tabular-nums text-[#141413] mt-0.5">
                {formatCOP(activeSlice ? activeSlice.value : total)}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-[#9E9B93] mt-0.5">
                {activeSlice
                  ? `${((activeSlice.value / total) * 100).toFixed(1)}%`
                  : "100%"}
              </span>
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="w-full flex-1 space-y-2">
            {segments.map((seg, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <button
                  key={seg.label}
                  type="button"
                  onClick={() => setActiveIndex(isSelected ? null : idx)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 text-left border transition-colors ${
                    isSelected
                      ? "bg-[#F6F5F2] border-[#141413]"
                      : "bg-transparent border-transparent hover:bg-[#F6F5F2]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-xs text-[#141413] truncate font-medium">
                      {seg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    <span className="text-xs font-mono tabular-nums text-[#141413]">
                      {formatCOP(seg.value)}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-[#6B6963] w-10 text-right">
                      {(seg.pct * 100).toFixed(0)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
