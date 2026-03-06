// BarChart - CSS/Tailwind-based, no external library
// Props: data: [{ label, value, color? }], maxValue?, height?, horizontal?
export function BarChart({ data, maxValue, height = 80, horizontal = false }) {
  if (!data || data.length === 0) return null;
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted-light dark:text-muted-dark truncate text-right">{d.label}</span>
            <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${d.color || "bg-accent"}`}
                style={{ width: `${Math.round((d.value / max) * 100)}%` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="w-10 shrink-0 font-mono text-muted-light dark:text-muted-dark">{d.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1 w-full overflow-x-auto" style={{ height: height + 20 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0" style={{ height: height + 20 }}>
          <div className="flex-1 w-full flex items-end">
            <div
              className={`w-full rounded-t transition-all ${d.color || "bg-accent"} opacity-80 hover:opacity-100`}
              style={{ height: max > 0 ? `${Math.round((d.value / max) * height)}px` : "2px" }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[9px] text-muted-light dark:text-muted-dark truncate w-full text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// TrendIndicator - inline arrow + value
// Props: value (number), suffix?
export function TrendIndicator({ value, suffix = "%" }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  if (value > 0) {
    return <span className="text-green-500 text-xs font-medium">↑{value}{suffix}</span>;
  }
  if (value < 0) {
    return <span className="text-red-500 text-xs font-medium">↓{Math.abs(value)}{suffix}</span>;
  }
  return <span className="text-gray-400 text-xs">→0{suffix}</span>;
}

// MiniSparkline - SVG polyline for inline trends
// Props: data: [number], color?, height?
export function MiniSparkline({ data, color = "#6366f1", height = 24 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 60;
  const padding = 2;
  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((v / max) * (height - 2 * padding));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="inline-block align-middle"
      style={{ overflow: "visible" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// HeatmapGrid - 7-column grid for weekday productivity heatmap
// Props: data: [number] (7 values Mon-Sun), labels: [string], colorScale?
export function HeatmapGrid({ data, labels }) {
  if (!data || data.length !== 7) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="grid grid-cols-7 gap-1">
      {data.map((v, i) => {
        const intensity = max > 0 ? v / max : 0;
        const opacity = 0.1 + intensity * 0.75;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-full rounded aspect-square"
              style={{ backgroundColor: `rgba(99,102,241,${opacity.toFixed(2)})` }}
              title={labels[i] ? `${labels[i]}: ${v}` : `${v}`}
            />
            <span className="text-[9px] text-muted-light dark:text-muted-dark leading-none">
              {labels[i] || ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
