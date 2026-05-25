interface Props {
  integrityScore: number;
  scannedCount: number;
  highRiskCount: number;
  cleanCount: number;
}

export function ScoreCards({ integrityScore, scannedCount, highRiskCount, cleanCount }: Props) {
  const scoreColor =
    integrityScore > 80 ? "#22d693" :
    integrityScore > 50 ? "#f5a623" : "#ff4d6a";

  const scoreLabel =
    integrityScore > 80 ? "Solid" :
    integrityScore > 50 ? "Needs Work" : "At Risk";

  return (
    <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">

      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] font-mono text-white/25 uppercase tracking-[0.15em] mb-2">
            Integrity Score
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-[52px] font-bold leading-none tracking-tight" style={{ color: scoreColor }}>
              {integrityScore}
            </span>
            <span className="text-[28px] font-bold text-white/20 leading-none">/100</span>
            <span className="text-[12px] font-mono font-semibold px-2.5 py-1 rounded-full border"
              style={{
                color: scoreColor,
                background: `${scoreColor}12`,
                borderColor: `${scoreColor}35`,
              }}>
              {scoreLabel}
            </span>
          </div>
        </div>

        <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r="26" fill="none"
            stroke={scoreColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 26}`}
            strokeDashoffset={`${2 * Math.PI * 26 * (1 - integrityScore / 100)}`}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
      </div>

      <div className="h-1 rounded-full bg-white/[0.05] mb-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${integrityScore}%`,
            background: `linear-gradient(90deg, #ff4d6a, ${scoreColor})`,
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Files Audited", value: scannedCount, color: "#4a9eff" },
          { label: "High Risk", value: highRiskCount, color: "#ff4d6a" },
          { label: "Clean Files", value: cleanCount, color: "#22d693" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-lg px-4 py-3 border border-white/[0.06] bg-white/[0.02]"
          >
            <p className="text-[11px] font-mono text-white/25 mb-1.5">{label}</p>
            <p className="text-[26px] font-bold leading-none tracking-tight" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}