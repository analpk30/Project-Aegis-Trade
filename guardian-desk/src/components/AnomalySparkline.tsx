import React from 'react';

interface AnomalySparklineProps {
  data: number[];               // sigma history
  contagion?: number[];         // contagion probability history (0..1), optional overlay
  redThreshold?: number;
  amberThreshold?: number;
  width?: number;
  height?: number;
}

/**
 * Enriched inline-SVG mini-chart of the live anomaly signal:
 *  - shaded GREEN/AMBER/RED severity zone bands (instant "what zone am I in")
 *  - gradient area fill under the sigma line, coloured by current severity
 *  - dashed threshold guides with value labels
 *  - peak marker (worst point in the window) and current-value head label
 *  - optional secondary line: contagion probability (right axis 0–100%)
 * No external deps.
 */
export const AnomalySparkline: React.FC<AnomalySparklineProps> = ({
  data,
  contagion,
  redThreshold = 4,
  amberThreshold = 2.5,
  width = 340,
  height = 76,
}) => {
  if (data.length < 2) {
    return <div className="text-[10px] font-mono text-slate-500">collecting signal…</div>;
  }

  const padX = 4;
  const padTop = 10;
  const padBottom = 12;
  const plotH = height - padTop - padBottom;
  const maxV = Math.max(redThreshold + 1.5, ...data);
  const minV = 0;
  const span = maxV - minV || 1;
  const n = data.length;

  const x = (i: number) => padX + (i / (n - 1)) * (width - 2 * padX);
  const y = (v: number) => padTop + plotH - ((v - minV) / span) * plotH;

  const last = data[n - 1];
  const peak = Math.max(...data);
  const peakIdx = data.indexOf(peak);
  const color = last >= redThreshold ? '#f43f5e' : last >= amberThreshold ? '#f59e0b' : '#10b981';

  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${(padTop + plotH).toFixed(1)} L${x(0).toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;

  const yRed = y(redThreshold);
  const yAmber = y(amberThreshold);
  const gid = 'spark-fill';

  // Optional contagion overlay (0..1 mapped to full plot height).
  const cLine =
    contagion && contagion.length === n
      ? contagion
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${(padTop + plotH - p * plotH).toFixed(1)}`)
          .join(' ')
      : null;
  const lastContagion = contagion && contagion.length ? contagion[contagion.length - 1] : null;

  return (
    <div className="space-y-1">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* severity zone bands */}
        <rect x={padX} y={padTop} width={width - 2 * padX} height={yRed - padTop} fill="#f43f5e" opacity="0.06" />
        <rect x={padX} y={yRed} width={width - 2 * padX} height={yAmber - yRed} fill="#f59e0b" opacity="0.06" />
        <rect x={padX} y={yAmber} width={width - 2 * padX} height={padTop + plotH - yAmber} fill="#10b981" opacity="0.05" />

        {/* threshold guides + labels */}
        <line x1={padX} x2={width - padX} y1={yRed} y2={yRed} stroke="#f43f5e" strokeOpacity="0.5" strokeDasharray="3 3" strokeWidth="1" />
        <line x1={padX} x2={width - padX} y1={yAmber} y2={yAmber} stroke="#f59e0b" strokeOpacity="0.45" strokeDasharray="3 3" strokeWidth="1" />
        <text x={width - padX} y={yRed - 2} textAnchor="end" fontSize="8" fill="#f43f5e" fillOpacity="0.8" fontFamily="monospace">RED {redThreshold}σ</text>
        <text x={width - padX} y={yAmber - 2} textAnchor="end" fontSize="8" fill="#f59e0b" fillOpacity="0.8" fontFamily="monospace">AMBER {amberThreshold}σ</text>

        {/* sigma area + line */}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />

        {/* contagion overlay */}
        {cLine && <path d={cLine} fill="none" stroke="#60a5fa" strokeOpacity="0.75" strokeWidth="1.2" strokeDasharray="2 2" />}

        {/* peak marker */}
        {peak >= amberThreshold && (
          <>
            <circle cx={x(peakIdx)} cy={y(peak)} r="2" fill="none" stroke={color} strokeWidth="1" />
            <text x={x(peakIdx)} y={y(peak) - 4} textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace">
              {peak.toFixed(1)}
            </text>
          </>
        )}

        {/* current head */}
        <circle cx={x(n - 1)} cy={y(last)} r="2.75" fill={color} />
        <text x={x(n - 1)} y={y(last) - 5} textAnchor="end" fontSize="9" fill={color} fontFamily="monospace" fontWeight="bold">
          {last.toFixed(1)}σ
        </text>
      </svg>

      {/* caption / legend */}
      <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-[2px] w-3" style={{ backgroundColor: color }} /> anomaly σ
        </span>
        {lastContagion != null && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-[2px] w-3 border-t border-dashed" style={{ borderColor: '#60a5fa' }} />
            contagion {(lastContagion * 100).toFixed(0)}%
          </span>
        )}
        <span className="ml-auto">peak {peak.toFixed(1)}σ · {n}s window</span>
      </div>
    </div>
  );
};
