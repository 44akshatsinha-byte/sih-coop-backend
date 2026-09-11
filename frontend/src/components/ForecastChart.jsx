/** Lightweight SVG line+bar chart — no Chart.js. */
export default function ForecastChart({ series = [] }) {
  const max = Math.max(1, ...series.map((d) => d.demand || 0));
  const w = 320;
  const h = 120;
  const pad = 8;
  const pts = series.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(series.length - 1, 1);
    const y = h - pad - ((d.demand || 0) / max) * (h - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full text-forest" role="img">
      {series.map((d, i) => {
        const bw = (w - pad * 2) / series.length;
        const bh = ((d.demand || 0) / max) * (h - pad * 2);
        const x = pad + i * bw + 2;
        const y = h - pad - bh;
        return (
          <rect key={d.date || i} x={x} y={y} width={Math.max(bw - 4, 2)} height={bh} fill="#3A5F5F" opacity="0.35" />
        );
      })}
      {pts.length > 1 && (
        <polyline fill="none" stroke="#2C5F4A" strokeWidth="2" points={pts.join(" ")} />
      )}
    </svg>
  );
}
