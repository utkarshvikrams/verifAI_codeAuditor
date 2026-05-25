import { GitNode, Issue, AIResult, FileSeverity, getFileSeverity } from "../types";
import { isCheckable } from "../checkers";
import { SeverityDot } from "./SeverityDot";

interface Props {
  node: GitNode;
  code: string;
  issues: Issue[];
  isOpen: boolean;
  ai: AIResult | undefined;
  isAiLoading: boolean;
  onToggle: () => void;
  onAIAnalysis: () => void;
}

export function FileRow({ node, code, issues, isOpen, ai, isAiLoading, onToggle, onAIAnalysis }: Props) {
  const checkable = isCheckable(node.path);
  const severity: FileSeverity = checkable ? getFileSeverity(issues) : "unknown";

  const severityMeta = {
    high:    { label: "HIGH",    color: "#ff4d6a", bg: "rgba(255,77,106,0.08)",   border: "rgba(255,77,106,0.2)"  },
    medium:  { label: "MEDIUM",  color: "#f5a623", bg: "rgba(245,166,35,0.08)",   border: "rgba(245,166,35,0.2)"  },
    clean:   { label: "CLEAN",   color: "#22d693", bg: "rgba(34,214,147,0.06)",   border: "rgba(34,214,147,0.15)" },
    unknown: { label: "—",       color: "#ffffff30", bg: "transparent",            border: "transparent"           },
  } as const;

  const meta = severityMeta[severity] ?? severityMeta.unknown;

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors group"
        style={{ background: isOpen ? "rgba(255,255,255,0.025)" : undefined }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.018)"; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = ""; }}
      >
        <SeverityDot severity={severity} />

        <span className="font-mono text-[12.5px] text-white/50 flex-1 truncate group-hover:text-white/70 transition-colors">
          {node.path}
        </span>

        {checkable && issues.length > 0 && (
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wider shrink-0"
            style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
          >
            {issues.length} issue{issues.length > 1 ? "s" : ""}
          </span>
        )}

        <span className="text-white/15 text-[10px] font-mono transition-colors group-hover:text-white/30 shrink-0">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.04]" style={{ background: "rgba(0,0,0,0.25)" }}>

          {checkable && issues.length > 0 && (
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.18em] mb-3">
                Issues Found
              </p>
              <div className="flex flex-col gap-2">
                {issues.map((issue, i) => {
                  const c =
                    issue.severity === "high"   ? { color: "#ff4d6a", bg: "rgba(255,77,106,0.07)",  border: "rgba(255,77,106,0.18)"  } :
                    issue.severity === "medium" ? { color: "#f5a623", bg: "rgba(245,166,35,0.07)",  border: "rgba(245,166,35,0.18)"  } :
                                                  { color: "#4a9eff", bg: "rgba(74,158,255,0.07)",  border: "rgba(74,158,255,0.18)"  };
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border-l-2 text-[12.5px]"
                      style={{ background: c.bg, borderLeftColor: c.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: c.color }} />
                      <div>
                        <p className="font-semibold text-white/70">{issue.type}</p>
                        <p className="text-[11.5px] text-white/35 mt-0.5 leading-relaxed">{issue.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {checkable && issues.length === 0 && (
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22d693]" />
              <span className="text-[12px] font-mono text-[#22d693]/70">No issues found</span>
            </div>
          )}

          {checkable && (
            <div className="px-5 py-4 border-b border-white/[0.04]">
              {!ai && !isAiLoading && (
                <button
                  onClick={onAIAnalysis}
                  className="w-full py-2.5 rounded-lg text-[12.5px] font-mono font-medium border transition-all
                             hover:bg-white/[0.05]"
                  style={{
                    color: "#ff5a00",
                    borderColor: "rgba(255,90,0,0.25)",
                    background: "rgba(255,90,0,0.05)",
                  }}
                >
                  ◉ Run Deep AI Analysis
                </button>
              )}

              {isAiLoading && (
                <div className="flex items-center justify-center gap-2 py-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a00] animate-ping" />
                  <p className="text-[12px] font-mono text-[#ff5a00]/60 animate-pulse">
                    AI is analyzing your code…
                  </p>
                </div>
              )}

              {ai && (
                <div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.18em] mb-3">
                    AI Analysis
                  </p>
                  <div className="mb-3 p-3 rounded-lg border text-[12.5px] text-white/50 leading-relaxed"
                    style={{ background: "rgba(255,90,0,0.05)", borderColor: "rgba(255,90,0,0.15)" }}>
                    {ai.summary}
                  </div>

                  {ai.issues.length === 0 ? (
                    <div className="p-3 rounded-lg border text-[12px] font-mono"
                      style={{ background: "rgba(34,214,147,0.06)", borderColor: "rgba(34,214,147,0.2)", color: "#22d693" }}>
                      ✓ No issues found by AI
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {ai.issues.map((issue, i) => {
                        const c =
                          issue.severity === "high"   ? { color: "#ff4d6a", bg: "rgba(255,77,106,0.07)"  } :
                          issue.severity === "medium" ? { color: "#f5a623", bg: "rgba(245,166,35,0.07)"  } :
                                                        { color: "#4a9eff", bg: "rgba(74,158,255,0.07)"  };
                        return (
                          <div key={i} className="p-3 rounded-lg border-l-2 text-[12.5px]"
                            style={{ background: c.bg, borderLeftColor: c.color }}>
                            <p className="font-semibold text-white/70 mb-1" style={{ color: c.color }}>{issue.type}</p>
                            <p className="text-[11.5px] text-white/35 leading-relaxed">{issue.explanation}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <pre
            className="px-5 py-4 overflow-x-auto text-[11.5px] leading-relaxed font-mono max-h-64"
            style={{ color: "rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.35)" }}
          >
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}