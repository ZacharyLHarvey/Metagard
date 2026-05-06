type Slice = {
  label: string;
  value: number;
  color: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export default function PieChart({
  title,
  slices,
  size = 320,
}: {
  title: string;
  slices: Slice[];
  size?: number;
}) {
  const total = slices.reduce((acc, s) => acc + (Number.isFinite(s.value) ? s.value : 0), 0);
  const radius = Math.floor(size / 2) - 6;
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);

  if (!total) {
    return (
      <section className="border border-neutral-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-neutral-500 mt-2">No data yet.</p>
      </section>
    );
  }

  const positive = slices.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const singleFullSlice = positive.length === 1 && positive[0]!.value === total;

  let current = 0;
  const arcs = positive
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (current / total) * 360;
      current += s.value;
      const end = (current / total) * 360;
      return { ...s, start, end };
    });

  return (
    <section className="border border-neutral-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-6 items-start">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
          <circle cx={cx} cy={cy} r={radius} fill="#0a0a0a" stroke="#262626" strokeWidth="1" />
          {singleFullSlice ? (
            <circle cx={cx} cy={cy} r={radius} fill={positive[0]!.color} stroke="#0a0a0a" />
          ) : (
            arcs.map((a) => (
              <path
                key={a.label}
                d={describeArc(cx, cy, radius, a.start, a.end)}
                fill={a.color}
                stroke="#0a0a0a"
              />
            ))
          )}
        </svg>

        <ul className="space-y-2 text-sm min-w-[18rem]">
          {slices
            .slice()
            .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
            .map((s) => {
              const pct = total > 0 ? ((Number.isFinite(s.value) ? s.value : 0) / total) * 100 : 0;
              return (
                <li key={s.label} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="text-neutral-400 shrink-0 tabular-nums">
                  {s.value}{" "}
                  <span className="text-neutral-500">
                    ({pct.toFixed(1)}%)
                  </span>
                </span>
              </li>
              );
            })}
        </ul>
      </div>
    </section>
  );
}

