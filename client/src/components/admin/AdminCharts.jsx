import { useState } from 'react';

/**
 * Dependency-free SVG charts for the admin dashboard.
 * Colours come from the brand palette (CSS variables in index.css).
 */

/** Pie (donut) chart. `data` = [{ label, value, color }]. */
export function PieChart({ data, centerLabel = 'Total' }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No data yet.</p>;
  }

  const R = 70; // radius of the ring's centre line
  const STROKE = 28;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const length = (d.value / total) * C;
      const segment = { ...d, length, offset };
      offset += length;
      return segment;
    });
  const shown = active != null ? data.find((d) => d.label === active) : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 200 200" className="h-48 w-48 shrink-0" role="img" aria-label="Pie chart">
        <g transform="rotate(-90 100 100)">
          {segments.map((s) => (
            <circle
              key={s.label}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.label ? STROKE + 6 : STROKE}
              strokeDasharray={`${s.length} ${C - s.length}`}
              strokeDashoffset={-s.offset}
              className="cursor-pointer transition-all duration-200"
              opacity={active && active !== s.label ? 0.45 : 1}
              onMouseEnter={() => setActive(s.label)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </g>
        <text x="100" y="98" textAnchor="middle" className="fill-gray-900 text-[28px] font-extrabold">
          {shown ? shown.value : total}
        </text>
        <text x="100" y="118" textAnchor="middle" className="fill-gray-500 text-[11px] font-medium capitalize">
          {shown ? shown.label : centerLabel}
        </text>
      </svg>

      <ul className="w-full max-w-[14rem] space-y-2">
        {data.map((d) => (
          <li
            key={d.label}
            onMouseEnter={() => setActive(d.label)}
            onMouseLeave={() => setActive(null)}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 capitalize text-gray-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
              {d.label}
            </span>
            <span className="font-semibold text-gray-900">
              {d.value}
              <span className="ml-1.5 text-xs font-normal text-gray-500">{Math.round((d.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical bar graph. `data` = [{ label, value }]. */
export function BarChart({ data, color = 'var(--color-brand-500)', height = 220 }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 0);

  if (data.length === 0 || max === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No data yet.</p>;
  }

  // Round the axis max up to a multiple of 4 so the 4 gridlines sit on whole values.
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const ticks = [0, 1, 2, 3, 4].map((i) => (niceMax / 4) * i);

  const W = 520;
  const PAD = { top: 16, right: 8, bottom: 30, left: 34 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(44, slot * 0.6);
  const y = (v) => PAD.top + innerH - (v / niceMax) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Bar graph">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-brand-200)" strokeWidth="1" />
          <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" className="fill-gray-500 text-[10px]">
            {t}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const barH = Math.max(d.value > 0 ? 2 : 0, innerH - (y(d.value) - PAD.top));
        const isActive = active === i;
        return (
          <g
            key={d.label}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="cursor-pointer"
          >
            <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
            <rect
              x={x}
              y={PAD.top + innerH - barH}
              width={barW}
              height={barH}
              rx="5"
              fill={color}
              opacity={active != null && !isActive ? 0.55 : 1}
              className="transition-opacity duration-150"
            />
            <text
              x={x + barW / 2}
              y={PAD.top + innerH - barH - 6}
              textAnchor="middle"
              className={`text-[11px] font-semibold ${isActive || d.value === max ? 'fill-gray-900' : 'fill-gray-500'}`}
            >
              {d.value}
            </text>
            <text x={x + barW / 2} y={height - 10} textAnchor="middle" className="fill-gray-600 text-[10.5px]">
              {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Card wrapper matching the dashboard's existing panels. */
export function ChartCard({ title, subtitle, className = '', children }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-gray-200 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
