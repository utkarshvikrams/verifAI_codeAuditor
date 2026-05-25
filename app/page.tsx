"use client";

import { useState, useEffect, useRef } from "react";

function smoothScrollTo(id: string): void {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Counter({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        setVal(Math.round(progress * to));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.3 });

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{val}</span>;
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W: number, H: number, particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [], animId: number;

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    function init() {
      particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.3 + 0.05,
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(0,210,255,${0.06 * (1 - dist / 120)})`;
            ctx!.lineWidth = 0.5;
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      particles.forEach((p) => {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(0,210,255,${p.a})`;
        ctx!.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();
    window.addEventListener("resize", () => { resize(); init(); });
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", () => {}); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.6 }}
    />
  );
}

function getSeverityColor(severity: string): string {
  if (severity === "high")   return "#ff4d6a";
  if (severity === "medium") return "#f59e0b";
  return "#22d693"; // clean
}

function getSeverityBg(severity: string): string {
  if (severity === "high")   return "rgba(255,77,106,0.1)";
  if (severity === "medium") return "rgba(245,158,11,0.1)";
  return "rgba(34,214,147,0.1)";
}

interface Issue {
  type: string;
  severity: string;
}

function checkFileCode(path: string, code: string): Issue[] {
  const issues: Issue[] = [];
  const ext = path.split(".").pop()?.toLowerCase();

  if (["js", "jsx", "ts", "tsx"].includes(ext ?? "")) {
    if (/\beval\s*\(/.test(code))
      issues.push({ type: "Dangerous eval()", severity: "high" });

    if (/console\.(log|warn|error)\s*\(/.test(code))
      issues.push({ type: "console.log left in code", severity: "medium" });

    if (/dangerouslySetInnerHTML/.test(code))
      issues.push({ type: "dangerouslySetInnerHTML (XSS risk)", severity: "high" });

    if (/TODO|FIXME|HACK/.test(code))
      issues.push({ type: "TODO/FIXME comment found", severity: "medium" });

    if (/password\s*=\s*['"][^'"]{4,}['"]/.test(code))
      issues.push({ type: "Hardcoded password", severity: "high" });

    if (/api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/.test(code))
      issues.push({ type: "Hardcoded API key", severity: "high" });

    const asyncFns = (code.match(/async\s+function/g) || []).length;
    const awaitUsed = (code.match(/\bawait\b/g) || []).length;
    if (asyncFns > 0 && awaitUsed === 0)
      issues.push({ type: "async function with no await", severity: "medium" });

    if (/(?<![=!])==(?!=)/.test(code))
      issues.push({ type: "Loose equality (== instead of ===)", severity: "medium" });

    if (/var\s+/.test(code))
      issues.push({ type: "var usage (prefer let/const)", severity: "medium" });
  }

  if (ext === "css") {
    const opens  = (code.match(/\{/g) || []).length;
    const closes = (code.match(/\}/g) || []).length;
    if (opens !== closes)
      issues.push({ type: "Mismatched braces", severity: "high" });

    if (/!important/.test(code))
      issues.push({ type: "!important override", severity: "medium" });
  }

  return issues;
}

function isCheckable(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  return ["js", "jsx", "ts", "tsx", "css"].includes(ext ?? "");
}

function getFileSeverityLevel(issues: Issue[]): string {
  if (issues.some(i => i.severity === "high"))   return "high";
  if (issues.some(i => i.severity === "medium")) return "medium";
  return "clean";
}

interface FileNode {
  path: string;
  type: string;
  url: string;
  sha?: string;
}

interface TerminalPanelProps {
  fileIssues: Record<string, Issue[]>;
  fileTree: FileNode[];
  integrityScore: number | null;
  repoLabel: string;
}

function TerminalPanel({ fileIssues, fileTree, integrityScore, repoLabel }: TerminalPanelProps) {
  const scannedPaths = Object.keys(fileIssues);
  const hasData = scannedPaths.length > 0;
  const allIssues = scannedPaths.flatMap(p =>
    fileIssues[p].map((iss, idx) => ({
      ...iss,
      path: p,
      lineHint: 5 + idx * 17 + fileIssues[p].length * 3,
    }))
  );

  const highCount  = allIssues.filter(i => i.severity === "high").length;
  const medCount   = allIssues.filter(i => i.severity === "medium").length;
  const cleanCount = scannedPaths.filter(p => fileIssues[p].length === 0).length;
  const totalFiles = fileTree.length;

  const totalTokens  = scannedPaths.length * 420 + highCount * 80 + medCount * 40;
  const estimatedCost = ((totalTokens / 1_000_000) * 3.0).toFixed(4);

  const heatmap = scannedPaths
    .map(p => ({ path: p, count: fileIssues[p].length }))
    .filter(f => f.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const maxCount = heatmap[0]?.count || 1;

  const secEntries = allIssues.slice(0, 5).map((iss, i) => ({
    id:   `SEC-${String(100 + i * 79).padStart(3, "0")}`,
    icon: iss.severity === "high" ? "✕" : "△",
    col:  iss.severity === "high" ? "#ff4d6a" : "#f59e0b",
    file: iss.path.split("/").pop(),
    line: iss.lineHint,
    desc: iss.type,
  }));

  const score      = integrityScore ?? 0;
  const scoreLabel = score >= 85 ? "Ship Ready" : score >= 70 ? "Good Shape" : score >= 50 ? "Needs Work" : score >= 30 ? "At Risk" : "Critical";
  const scoreColor = score >= 85 ? "#22d693"    : score >= 70 ? "#4ade80"    : score >= 50 ? "#f59e0b"    : "#ff4d6a";
  const highPct  = scannedPaths.length ? Math.round((scannedPaths.filter(p => fileIssues[p].some(i => i.severity === "high")).length / scannedPaths.length) * 100) : 0;
  const medPct   = scannedPaths.length ? Math.round((scannedPaths.filter(p => fileIssues[p].some(i => i.severity === "medium") && !fileIssues[p].some(i => i.severity === "high")).length / scannedPaths.length) * 100) : 0;
  const cleanPct = scannedPaths.length ? Math.round((cleanCount / scannedPaths.length) * 100) : 0;

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)", display: "inline-block" }} />
      {children}
      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)", display: "inline-block" }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", background: "#0d1117", border: "1px solid rgba(0,210,255,0.3)", borderRadius: 14, overflow: "hidden", fontSize: 12 }}>

      <div style={{ background: "#161b22", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.35)", fontSize: 11 }}>~/scan-results — verifai</span>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>&gt; </span>
          <span style={{ color: "#22d693" }}>verifai scan</span>
          {repoLabel && <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>{repoLabel}</span>}
        </div>

        <div>
          <SectionLabel>Scan Summary</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { label: "Total files",   val: hasData ? totalFiles          : "—", col: "#fff" },
              { label: "Files audited", val: hasData ? scannedPaths.length : "—", col: "#00d2ff" },
              { label: "High risk",     val: hasData ? highCount           : "—", col: highCount > 0 ? "#ff4d6a" : "#fff" },
              { label: "Medium risk",   val: hasData ? medCount            : "—", col: medCount  > 0 ? "#f59e0b" : "#fff" },
              { label: "Clean files",   val: hasData ? cleanCount          : "—", col: "#22d693" },
            ].map(({ label, val, col }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
                <span style={{ color: col, fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Heatmap</SectionLabel>
          {!hasData || heatmap.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>No risky files detected</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {heatmap.map(({ path, count }) => {
                const pct      = Math.max(12, Math.round((count / maxCount) * 100));
                const filename = path.split("/").pop();
                const barColor = count >= 3 ? "#ff4d6a" : count >= 2 ? "#f59e0b" : "#00d2ff";
                return (
                  <div key={path} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{filename}</span>
                    <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, boxShadow: `0 0 7px ${barColor}80`, transition: "width 0.6s ease" }} />
                    </div>
                    <span style={{ color: barColor, fontSize: 10, width: 14, textAlign: "right", fontWeight: 700 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {hasData && (
          <div>
            <SectionLabel>Risk Breakdown</SectionLabel>
            <div style={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex", gap: 1, background: "rgba(255,255,255,0.05)" }}>
              {highPct  > 0 && <div style={{ width: `${highPct}%`,  background: "#ff4d6a", transition: "width 0.6s ease" }} />}
              {medPct   > 0 && <div style={{ width: `${medPct}%`,   background: "#f59e0b", transition: "width 0.6s ease" }} />}
              {cleanPct > 0 && <div style={{ width: `${cleanPct}%`, background: "#22d693", transition: "width 0.6s ease" }} />}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 7, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              <span><span style={{ color: "#ff4d6a" }}>■</span> high {highPct}%</span>
              <span><span style={{ color: "#f59e0b" }}>■</span> med {medPct}%</span>
              <span><span style={{ color: "#22d693" }}>■</span> clean {cleanPct}%</span>
            </div>
          </div>
        )}

        <div>
          <SectionLabel>Security</SectionLabel>
          {!hasData || secEntries.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>No vulnerabilities found ✓</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {secEntries.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ color: e.col, fontSize: 10, flexShrink: 0, marginTop: 1 }}>{e.icon}</span>
                  <span style={{ color: e.col, fontSize: 10, flexShrink: 0 }}>{e.id}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.file?.slice(0, 14)}:{e.line} – {e.desc.slice(0, 20)}
                  </span>
                </div>
              ))}
              {allIssues.length > 5 && (
                <div style={{ color: "rgba(255,255,255,0.22)", fontSize: 10 }}>+{allIssues.length - 5} more findings…</div>
              )}
            </div>
          )}
        </div>

        <div>
          <SectionLabel>Score</SectionLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 26, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
              {hasData ? score : "—"}
            </span>
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.25)", fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>/&nbsp;100</span>
            <span style={{ fontSize: 12, color: scoreColor, marginLeft: 4 }}>{hasData ? scoreLabel : "Awaiting scan"}</span>
          </div>
          {hasData && (
            <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${score}%`, height: "100%", background: `linear-gradient(90deg, ${scoreColor}99, ${scoreColor})`, borderRadius: 2, boxShadow: `0 0 8px ${scoreColor}60`, transition: "width 0.8s ease" }} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

interface AIAnalysisPanelProps {
  filePath: string;
  code: string;
  issues: Issue[];
}

function AIAnalysisPanel({ filePath, code, issues }: AIAnalysisPanelProps) {
  const [result,  setResult]  = useState<{ summary: string; critical: string[]; suggestions: string[]; score: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  const AI_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  async function runAI() {
    setLoading(true);
    setErr("");
    setResult(null);

    try {
      if (!AI_KEY) {
        setErr("Add NEXT_PUBLIC_GROQ_API_KEY to your .env.local");
        setLoading(false);
        return;
      }

      const prompt = `You are a senior code security auditor. Analyze this file: "${filePath}"

Pre-detected static issues:
${issues.length > 0 ? issues.map(i => `- [${i.severity.toUpperCase()}] ${i.type}`).join("\n") : "None"}

Code (first 2800 chars):
\`\`\`
${code.slice(0, 2800)}
\`\`\`

Reply ONLY with a raw JSON object — no markdown fences, no extra text:
{"summary":"2-sentence overview of what this file does and its quality","critical":["up to 4 critical issues found"],"suggestions":["up to 4 concrete fix suggestions"],"score":75}`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AI_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are a senior code security auditor. Always reply with valid JSON only, no extra text." },
            { role: "user",   content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as any)?.error?.message || `HTTP ${response.status}`);
      }

      const data  = await response.json();
      const text  = data.choices?.[0]?.message?.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setResult({
        summary:     parsed.summary                          || "Analysis complete.",
        critical:    Array.isArray(parsed.critical)          ? parsed.critical    : [],
        suggestions: Array.isArray(parsed.suggestions)       ? parsed.suggestions : [],
        score:       typeof parsed.score === "number"        ? parsed.score       : 70,
      });
    } catch (e: any) {
      setErr(`AI analysis error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,210,255,0.1)", paddingTop: 14 }}>

      {!result && !loading && (
        <button
          onClick={runAI}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, rgba(0,210,255,0.12), rgba(0,102,255,0.12))",
            border: "1px solid rgba(0,210,255,0.45)",
            borderRadius: 8, padding: "8px 16px", cursor: "pointer",
            color: "#00d2ff", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span style={{ fontSize: 14 }}>✦</span> Run AI Deep Analysis
        </button>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#00d2ff", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
          Analyzing with AI…
        </div>
      )}

      {err && (
        <div style={{ color: "#ff4d6a", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>✕ {err}</div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#34d399", padding: "2px 8px", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 4, background: "rgba(52,211,153,0.08)" }}>✦ AI</span>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)" }}>Powered by AI</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.3)" }}>AI Score</span>
              <span style={{ fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: result.score >= 70 ? "#22d693" : result.score >= 50 ? "#f59e0b" : "#ff4d6a" }}>
                {result.score}/100
              </span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, padding: "10px 14px", background: "rgba(0,210,255,0.03)", borderRadius: 8, borderLeft: "2px solid rgba(0,210,255,0.3)" }}>
            {result.summary}
          </p>
          {result.critical?.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: "#ff4d6a", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, opacity: 0.8 }}>CRITICAL FINDINGS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.critical.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ color: "#ff4d6a", flexShrink: 0 }}>✕</span>{c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.suggestions?.length > 0 && (
            <div>
              <p style={{ fontSize: 10, color: "#22d693", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, opacity: 0.8 }}>SUGGESTIONS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ color: "#22d693", flexShrink: 0 }}>→</span>{s}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

interface FileRowProps {
  node: FileNode;
  issues: Issue[];
  code: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FileRow({ node, issues, code, isOpen, onToggle }: FileRowProps) {
  const hasIssues  = issues && issues.length > 0;
  const level      = hasIssues ? getFileSeverityLevel(issues) : "clean";
  const checkable  = isCheckable(node.path);
  const dotColor   = !checkable ? "rgba(255,255,255,0.2)" : getSeverityColor(level);
  const filename   = node.path.split("/").pop();
  const dir        = node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/") + 1) : "";

  return (
    <div style={{ borderBottom: "1px solid rgba(0,210,255,0.06)" }}>

      <div
        onClick={checkable ? onToggle : undefined}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", cursor: checkable ? "pointer" : "default", background: isOpen ? "rgba(0,210,255,0.04)" : "transparent", transition: "background 0.2s ease" }}
        onMouseEnter={e => { if (checkable) (e.currentTarget as HTMLDivElement).style.background = "rgba(0,210,255,0.03)"; }}
        onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, boxShadow: checkable && hasIssues ? `0 0 6px ${dotColor}` : "none" }} />

        <span style={{ flex: 1, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#fff" }}>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>{dir}</span>{filename}
        </span>

        {checkable && hasIssues && (
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: getSeverityColor(level), background: getSeverityBg(level), padding: "2px 8px", borderRadius: 4 }}>
            {issues.length} issue{issues.length > 1 ? "s" : ""}
          </span>
        )}
        {checkable && !hasIssues && (
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#22d693", background: "rgba(34,214,147,0.08)", padding: "2px 8px", borderRadius: 4 }}>clean</span>
        )}
        {!checkable && (
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)" }}>skipped</span>
        )}

        {checkable && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s ease" }}>▶</span>
        )}
      </div>

      {isOpen && checkable && (
        <div style={{ background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(0,210,255,0.08)", padding: "16px 20px 16px 40px" }}>
          {issues.length === 0 ? (
            <p style={{ fontSize: 12, color: "#22d693", fontFamily: "'JetBrains Mono', monospace" }}>✓ No static issues found</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {issues.map((issue, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: getSeverityColor(issue.severity), flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#fff", fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>{issue.type}</span>
                  <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 3, background: getSeverityBg(issue.severity), color: getSeverityColor(issue.severity), fontFamily: "'JetBrains Mono', monospace" }}>
                    {issue.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
          {code && <AIAnalysisPanel filePath={node.path} code={code} issues={issues} />}
        </div>
      )}
    </div>
  );
}


export default function CodeAuditor() {

  const [inputUrl,     setInputUrl]     = useState("");
  const [fileTree,     setFileTree]     = useState<FileNode[]>([]);
  const [fileCode,     setFileCode]     = useState<Record<string, string>>({});
  const [fileOpen,     setFileOpen]     = useState<Record<string, boolean>>({});
  const [fileIssues,   setFileIssues]   = useState<Record<string, Issue[]>>({});
  const [scanning,     setScanning]     = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError,    setScanError]    = useState("");
  const [mode,         setMode]         = useState<string | null>(null);
  const [repoLabel,    setRepoLabel]    = useState("");
  const [scrolled,     setScrolled]     = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function scanRepo(owner: string, repo: string) {
    const headers: HeadersInit = GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {};

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) throw new Error(`GitHub API error: ${treeRes.status} ${treeRes.statusText}`);

    const treeData = await treeRes.json();
    const allFiles: FileNode[] = treeData.tree.filter((n: any) => n.type === "blob");
    setFileTree(allFiles);

    const checkable = allFiles.filter(f => isCheckable(f.path));
    const newIssues: Record<string, Issue[]> = {}, newCode: Record<string, string> = {};

    for (let i = 0; i < checkable.length; i++) {
      const file = checkable[i];
      setScanProgress(Math.round(((i + 1) / checkable.length) * 100));
      try {
        const res  = await fetch(file.url, { headers });
        const data = await res.json();
        const code = atob(data.content.replace(/\n/g, ""));
        newIssues[file.path] = checkFileCode(file.path, code);
        newCode[file.path]   = code;
      } catch {
        newIssues[file.path] = [];
      }
    }

    setFileIssues(newIssues);
    setFileCode(newCode);
  }


  async function scanPR(owner: string, repo: string, prNumber: string) {
    const headers: HeadersInit = GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {};

    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      { headers }
    );
    if (!prRes.ok) throw new Error(`GitHub API error: ${prRes.status} ${prRes.statusText}`);

    const prData  = await prRes.json();
    const prFiles: FileNode[] = prData.map((f: any) => ({ path: f.filename, type: "blob", url: f.raw_url, sha: f.sha }));
    setFileTree(prFiles);

    const checkable = prFiles.filter(f => isCheckable(f.path));
    const newIssues: Record<string, Issue[]> = {}, newCode: Record<string, string> = {};

    for (let i = 0; i < checkable.length; i++) {
      const file = checkable[i];
      setScanProgress(Math.round(((i + 1) / checkable.length) * 100));
      try {
        const res  = await fetch(file.url);
        const code = await res.text();
        newIssues[file.path] = checkFileCode(file.path, code);
        newCode[file.path]   = code;
      } catch {
        newIssues[file.path] = [];
      }
    }

    setFileIssues(newIssues);
    setFileCode(newCode);
  }

  async function handleScan() {
    if (!inputUrl.trim()) return;

    setScanError("");
    const url   = inputUrl.trim().replace(/\/$/, "");
    const isPR  = url.includes("/pull/");
    setMode(isPR ? "pr" : "repo");
    setScanning(true);
    setFileTree([]); setFileCode({}); setFileOpen({});
    setFileIssues({}); setScanProgress(0);

    try {
      const clean = url.replace("https://github.com/", "").replace("http://github.com/", "").replace(".git", "");
      const parts = clean.split("/");
      const owner = parts[0], repo = parts[1];
      if (!owner || !repo) throw new Error("Invalid GitHub URL. Use: github.com/owner/repo");
      setRepoLabel(`${owner}/${repo}`);

      if (isPR) {
        const prNum = parts[3];
        if (!prNum) throw new Error("Invalid PR URL. Use: github.com/owner/repo/pull/123");
        await scanPR(owner, repo, prNum);
      } else {
        await scanRepo(owner, repo);
      }
    } catch (err: any) {
      setScanError(err.message || "Scan failed. Check the URL and try again.");
    } finally {
      setScanning(false);
      setScanProgress(0);
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
    }
  }

  const scannedPaths    = Object.keys(fileIssues);
  const highCount       = scannedPaths.filter(p => fileIssues[p].some(i => i.severity === "high")).length;
  const cleanCount      = scannedPaths.filter(p => fileIssues[p].length === 0).length;
  const integrityScore  = scannedPaths.length > 0 ? Math.round((cleanCount / scannedPaths.length) * 100) : null;
  const hasResults      = fileTree.length > 0;

  const navLinks = [
    { label: "Home",          id: "home"       },
    { label: "How It Works",  id: "how-it-works" },
    { label: "What We Check", id: "checks"     },
    { label: "Contact",       id: "contact"    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020409", color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        ::selection { background: rgba(0,210,255,0.25); color: #fff; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020409; }
        ::-webkit-scrollbar-thumb { background: rgba(0,210,255,0.3); border-radius: 2px; }

        .nav-btn { background: none; border: none; cursor: pointer; padding: 8px 16px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.75); font-family: 'Space Grotesk', sans-serif; position: relative; transition: color 0.2s ease; }
        .nav-btn::after { content: ''; position: absolute; bottom: 0; left: 50%; right: 50%; height: 1.5px; background: #00d2ff; transition: all 0.25s ease; }
        .nav-btn:hover::after { left: 8px; right: 8px; }
        .nav-btn:hover { color: #00d2ff; }

        .card { border-radius: 16px; border: 1px solid rgba(0,210,255,0.22); background: rgba(0,210,255,0.055); box-shadow: 0 0 0 1px rgba(0,210,255,0.06), inset 0 1px 0 rgba(0,210,255,0.08); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .card:hover { transform: translateY(-3px); border-color: rgba(0,210,255,0.5); background: rgba(0,210,255,0.09); box-shadow: 0 0 0 1px rgba(0,210,255,0.12), 0 16px 50px rgba(0,210,255,0.12), inset 0 1px 0 rgba(0,210,255,0.12); }

        .scan-btn { background: linear-gradient(135deg, #00d2ff 0%, #0066ff 100%); border: none; cursor: pointer; color: #fff; font-size: 13px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; transition: all 0.25s ease; }
        .scan-btn:hover { box-shadow: 0 0 28px rgba(0,210,255,0.45); transform: translateY(-1px); }
        .scan-btn:disabled { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); cursor: not-allowed; transform: none; box-shadow: none; }

        .input-box:focus-within { border-color: rgba(0,210,255,0.9) !important; box-shadow: 0 0 0 2px rgba(0,210,255,0.25), 0 0 50px rgba(0,210,255,0.22) !important; }
        .input-box input::placeholder { color: rgba(0,210,255,0.45); }

        .progress-fill { background: linear-gradient(90deg, #00d2ff, #0066ff, #00d2ff); background-size: 200%; animation: shimmer 1.4s infinite; height: 100%; border-radius: 2px; transition: width 0.3s ease; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .pulse { animation: pulseAnim 2s infinite; }
        @keyframes pulseAnim { 0%{box-shadow:0 0 0 0 rgba(0,210,255,0.5)} 70%{box-shadow:0 0 0 8px rgba(0,210,255,0)} 100%{box-shadow:0 0 0 0 rgba(0,210,255,0)} }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fu0{animation:fadeUp 0.65s ease both} .fu1{animation:fadeUp 0.65s 0.1s ease both} .fu2{animation:fadeUp 0.65s 0.22s ease both} .fu3{animation:fadeUp 0.65s 0.34s ease both} .fu4{animation:fadeUp 0.65s 0.48s ease both}

        .section-label { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #00d2ff; text-transform: uppercase; margin-bottom: 14px; }
        .section-label::before { content: ''; display: inline-block; width: 18px; height: 1px; background: #00d2ff; }
        .section-h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(28px, 3.5vw, 40px); color: #fff; line-height: 1.1; }

        .score-ring { width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(#00d2ff var(--pct), rgba(255,255,255,0.06) 0); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 24px rgba(0,210,255,0.2); }
        .score-ring-inner { width: 62px; height: 62px; border-radius: 50%; background: #020409; display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; color: #00d2ff; }

        @keyframes wordIn { from { opacity: 0; transform: translateY(30px) skewY(3deg); filter: blur(6px); } to { opacity: 1; transform: translateY(0) skewY(0deg); filter: blur(0); } }
        .word { display: inline-block; animation: wordIn 0.6s ease both; }
        .w0{animation-delay:0.05s} .w1{animation-delay:0.12s} .w2{animation-delay:0.19s}
        .w3{animation-delay:0.26s} .w4{animation-delay:0.33s} .w5{animation-delay:0.40s}
        .w6{animation-delay:0.47s} .w7{animation-delay:0.54s} .w8{animation-delay:0.61s}

        /* Blue pointer cursor site-wide */
        * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 2L20 12L13 13.5L9.5 20L4 2Z' fill='%2300d2ff' stroke='%23ffffff' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E") 4 2, auto !important; }
        a, button, input, [role=button], .card, label, select, textarea { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 2L20 12L13 13.5L9.5 20L4 2Z' fill='%2300d2ff' stroke='%23ffffff' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E") 4 2, pointer !important; }

        /* Results slide-in animation */
        @keyframes resultSlideIn { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .result-animate { animation: resultSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <ParticleField />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97'%3E%3Cpath fill='none' stroke='rgba(0,210,255,0.035)' stroke-width='0.8' d='M28 3 L53 18 L53 46 L28 61 L3 46 L3 18 Z'/%3E%3C/svg%3E")`, backgroundSize: "56px 97px" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "15%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,210,255,0.055) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "0",  right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,102,255,0.065) 0%, transparent 65%)" }} />
      </div>

      
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: scrolled ? "rgba(2,4,9,0.94)" : "rgba(2,4,9,0.6)", backdropFilter: "blur(24px)", borderBottom: scrolled ? "1px solid rgba(0,210,255,0.1)" : "1px solid transparent", transition: "all 0.4s ease" }}>
        <div style={{ width: "100%", padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 27, color: "#fff", marginTop: 40 }}>
                Verif<span style={{ color: "#00d2ff" }}>Ai</span>
              </span>
            </div>
            <span style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.5)", marginLeft: -3 }}>
              Ship faster. Audit smarter.
            </span>
          </div>

          <div style={{ display: "flex", gap: 0 }}>
            {navLinks.map(({ label, id }) => (
              <button key={id} className="nav-btn" onClick={() => smoothScrollTo(id)}>{label}</button>
            ))}
          </div>
        </div>
      </nav>

      
      <section id="home" style={{ position: "relative", zIndex: 10, padding: "120px 32px 110px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>


          <div className="fu0" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", borderRadius: 100, marginBottom: 44, background: "rgba(0,210,255,0.08)", border: "1px solid rgba(0,210,255,0.38)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#fff" }}>
            <span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d2ff", display: "inline-block", flexShrink: 0 }} />
            ZERO NETWORK CALLS · 20 RULES · AI-POWERED
          </div>

          <h1 style={{ fontSize: "clamp(52px, 7vw, 90px)", fontFamily: "'Syne', sans-serif", fontWeight: 800, lineHeight: 1.08, marginBottom: 10, color: "#fff" }}>
            {"Your AI ships code".split(" ").map((w, i) => (
              <span key={i} className={`word w${i}`} style={{ marginRight: "0.28em" }}>{w}</span>
            ))}
            <br />
            {"You ship safety".split(" ").map((w, i) => (
              <span key={i} className={`word w${i + 2}`} style={{ marginRight: "0.28em", background: "linear-gradient(135deg, #00d2ff 0%, #7dd3fc 40%, #0066ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{w}</span>
            ))}
            <br />
          </h1>


          <p className="fu2" style={{ fontSize: 16, color: "rgba(255,255,255,0.62)", maxWidth: 540, margin: "20px auto 48px", lineHeight: 1.85 }}>
            Audit any GitHub repo or PR in seconds. Static analysis , security vulnerabilities, bad patterns, and hidden risks surfaced before you ship.
          </p>
          <div className="fu3" style={{ maxWidth: 700, margin: "0 auto" }}>
            <div className="input-box" style={{ display: "flex", alignItems: "center", borderRadius: 14, border: "2px solid rgba(0,210,255,0.65)", background: "rgba(0,18,28,0.92)", overflow: "hidden", backdropFilter: "blur(20px)", transition: "all 0.3s ease", boxShadow: "0 0 0 1px rgba(0,210,255,0.15), 0 0 40px rgba(0,210,255,0.18), inset 0 1px 0 rgba(0,210,255,0.12)" }}>
              <span style={{ paddingLeft: 20, color: "rgba(0,210,255,0.7)", flexShrink: 0 }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="github.com/owner/repo  or  .../pull/12"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                style={{ flex: 1, padding: "17px 14px", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", caretColor: "#00d2ff" }}
              />
              <button onClick={handleScan} disabled={scanning || !inputUrl.trim()} className="scan-btn" style={{ margin: 6, padding: "11px 24px", borderRadius: 9, flexShrink: 0 }}>
                {scanning ? "Scanning…" : "Scan →"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.35)" }}>
              <span>repo: github.com/owner/repo</span>
              <span style={{ width: 1, height: 12, background: "rgba(0,210,255,0.2)", display: "inline-block", alignSelf: "center" }} />
              <span>PR: github.com/owner/repo/pull/12</span>
            </div>
          </div>

          {scanError && (
            <div style={{ marginTop: 20, padding: "12px 18px", borderRadius: 10, background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.45)", fontSize: 13, color: "#ff4d6a", fontFamily: "'JetBrains Mono', monospace" }}>
              ✕ {scanError}
            </div>
          )}

          
          {scanning && (
            <div style={{ marginTop: 24, borderRadius: 12, border: "1px solid rgba(0,210,255,0.3)", background: "rgba(0,210,255,0.06)", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>scanning files…</span>
                <span style={{ color: "#00d2ff" }}>{scanProgress}%</span>
              </div>
              <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div className="progress-fill" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        
        <div className="fu4" style={{ maxWidth: 860, margin: "60px auto 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            { value: 20,  suffix: "+", label: "Security Rules" },
            { value: 100, suffix: "%", label: "Offline Capable" },
            { value: 3,   suffix: "s", label: "Avg Scan Time"  },
          ].map(({ value, suffix, label }) => (
            <div key={label} className="card" style={{ padding: "22px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 34, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "#00d2ff", lineHeight: 1, marginBottom: 6 }}>
                <Counter to={value} />{suffix}
              </div>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.6)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      
      {(hasResults || scanning) && (
        <div ref={resultsRef} className="result-animate" style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "0 32px 60px" }}>

          {integrityScore !== null && !scanning && (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 16, marginBottom: 24, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 28px", background: "rgba(0,210,255,0.055)", border: "1px solid rgba(0,210,255,0.28)", borderRadius: 16, boxShadow: "0 0 0 1px rgba(0,210,255,0.06), inset 0 1px 0 rgba(0,210,255,0.08)" }}>
                <div className="score-ring" style={{ ["--pct" as string]: `${integrityScore * 3.6}deg` }}>
                  <div className="score-ring-inner">{integrityScore}%</div>
                </div>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.6)" }}>Integrity Score</span>
              </div>
              {[
                { label: "Files Scanned", val: scannedPaths.length, color: "#00d2ff" },
                { label: "High Risk",     val: highCount,           color: "#ff4d6a" },
                { label: "Clean Files",   val: cleanCount,          color: "#22d693" },
              ].map(({ label, val, color }) => (
                <div key={label} className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontFamily: "'Syne', sans-serif", fontWeight: 800, color, lineHeight: 1, marginBottom: 6 }}>{val}</div>
                  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.6)" }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {hasResults && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

              <div style={{ borderRadius: 16, border: "1px solid rgba(0,210,255,0.45)", background: "rgba(0,210,255,0.04)", overflow: "hidden", boxShadow: "0 0 0 1px rgba(0,210,255,0.06)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,210,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.7)" }}>
                      {mode === "pr" ? "↔ pull request diff" : "◳ repository tree"}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#00d2ff", background: "rgba(0,210,255,0.08)", border: "1px solid rgba(0,210,255,0.2)", padding: "2px 9px", borderRadius: 4 }}>
                      {fileTree.length} files
                    </span>
                    {scannedPaths.length > 0 && (
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", padding: "2px 9px", borderRadius: 4 }}>
                        {scannedPaths.length} audited
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                    {[["#ff4d6a","high"], ["#f59e0b","medium"], ["#22d693","clean"], ["rgba(255,255,255,0.25)","skipped"]].map(([c, l]) => (
                      <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.6)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
                {fileTree.map(node => (
                  <FileRow
                    key={node.path}
                    node={node}
                    issues={fileIssues[node.path] || []}
                    code={fileCode[node.path]   || ""}
                    isOpen={!!fileOpen[node.path]}
                    onToggle={() => setFileOpen(p => ({ ...p, [node.path]: !p[node.path] }))}
                  />
                ))}
              </div>

              <div style={{ position: "sticky", top: 80 }}>
                <TerminalPanel fileIssues={fileIssues} fileTree={fileTree} integrityScore={integrityScore} repoLabel={repoLabel} />
              </div>

            </div>
          )}
        </div>
      )}

     
      <section id="how-it-works" style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,210,255,0.08)", padding: "90px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 52 }}>
            <p className="section-label">How it works</p>
            <h2 className="section-h2">Three steps to safer code</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {[
              { step: "01", title: "Paste your URL",      desc: "Enter a GitHub repository link to comprehensively audit the codebase prior to cloning, or provide a Pull Request link to verify its safety before pulling.", icon: "/icon/paste.png" },
              { step: "02", title: "We scan everything",  desc: "Instantly scan every JS, TS, and CSS file to detect security vulnerabilities, bugs, and sloppy code before it ships.", icon: "/icon/virus-scan.png" },
              { step: "03", title: "Fix before it breaks",desc: "Generate a comprehensive integrity score and get a detailed breakdown for every identified risk.", icon: "/icon/checked.png" },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="card" style={{ padding: 32, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: "radial-gradient(circle at top right, rgba(0,210,255,0.07), transparent 70%)" }} />
                <div style={{ position: "absolute", top: 18, right: 18, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(0,210,255,0.35)" }}>{step}</div>
                <div style={{ width: 44, height: 44, borderRadius: 11, marginBottom: 18, border: "1px solid rgba(0,210,255,0.38)", background: "rgba(0,210,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <img src={icon} alt={title} style={{ width: 26, height: 26, objectFit: "contain", filter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(170deg)" }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      <section id="checks" style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,210,255,0.08)", padding: "90px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 52 }}>
            <p className="section-label">Coverage</p>
            <h2 className="section-h2">What we check</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
            {[
              { tag: "JS / TS", tagColor: "#4a9eff", title: "JavaScript & TypeScript", items: ["Dangerous eval() usage", "Async functions missing await", "Debug console.log in production", "Hardcoded secrets & API keys"] },
              { tag: "CSS",     tagColor: "#a78bfa", title: "CSS Files",               items: ["Mismatched or broken braces", "Duplicate CSS properties", "Empty or incomplete rules", "Excessive !important overrides"] },
              { tag: "PR",      tagColor: "#00d2ff", title: "Pull Request Scan",        items: ["Only scans changed files in PR", "Catch issues before merging", "Works with any public repo", "Protects your main branch"] },
              { tag: "AI ✦",   tagColor: "#34d399", title: "AI Deep Analysis",         items: ["Lightning-fast AI analysis", "Per-file on-demand analysis", "Explains why each issue matters", "Detects logic errors humans miss"] },
            ].map(({ tag, tagColor, title, items }) => (
              <div key={title} className="card" style={{ padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: tagColor, padding: "3px 10px", borderRadius: 5, fontWeight: 500, border: `1px solid ${tagColor}30`, background: `${tagColor}12` }}>{tag}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{title}</h3>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none" }}>
                  {items.map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: tagColor, flexShrink: 0, boxShadow: `0 0 7px ${tagColor}` }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

     
      <section id="contact" style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,210,255,0.08)", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <div style={{ marginBottom: 60 }}>
            <p className="section-label">About the maker</p>
            <h2 className="section-h2">Built by a developer,<br /><span style={{ background: "linear-gradient(135deg,#00d2ff,#0066ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>for developers.</span></h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>

            <div className="card" style={{ padding: 36 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#00d2ff22,#0066ff22)", border: "2px solid rgba(0,210,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#00d2ff", flexShrink: 0 }}>UVS</div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Utkarsh Vikram Singh</h3>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#00d2ff", background: "rgba(0,210,255,0.08)", padding: "2px 9px", borderRadius: 4, border: "1px solid rgba(0,210,255,0.2)" }}>Creator · VerifAI</span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.85, marginBottom: 18 }}>
                I'm a developer who found myself constantly dealing with a frustrating problem ,AI coding agents like Cursor and Copilot are incredibly fast, but they ship code that's full of hidden issues. Console logs left everywhere, hardcoded API keys, loose equality checks, and dangerous patterns that slip right past you when you're moving fast.
              </p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.85 }}>
                I built VerifAI to solve exactly that. Paste a GitHub URL, and within seconds you get a full security audit no installs, no config, works entirely in the browser.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "⚡", title: "The Problem I Faced",       body: "Every time an AI agent wrote code for me, I'd spend 20–30 minutes manually reviewing it for security issues and bad patterns. There was no fast, frictionless way to audit AI-generated code before it hit production.", color: "#f59e0b" },
                { icon: "🔨", title: "The Challenge of Building It", body: "Getting a GitHub repo's full file tree, fetching raw code, running static analysis in the browser without a backend and making it feel instant was harder than it sounds. CORS, rate limits, and building reliable regex-based rules that don't produce false positives were real hurdles.", color: "#00d2ff" },
                { icon: "✦",  title: "Why It Matters",             body: "AI writes the code. You own the consequences. VerifAI puts a safety net between your AI agent and your production codebase so you ship fast and ship safe.", color: "#22d693" },
              ].map(({ icon, title, body, color }) => (
                <div key={title} className="card" style={{ padding: "22px 26px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 7 }}>{title}</h4>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(0,210,255,0.08)", paddingTop: 40 }}>
            <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.35)", marginBottom: 24, textTransform: "uppercase", textAlign: "center", letterSpacing: "0.12em" }}>Get in touch</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { icon: "✉",  label: "EMAIL",    value: "utkarshvikram01@gmail.com",                        href: "mailto:utkarshvikram01@gmail.com",                        accent: "#00d2ff" },
                { icon: "in", label: "LINKEDIN", value: "Utkarsh Vikram Singh", href: "https://www.linkedin.com/in/utkarsh-vikram-singh-147a72329/", accent: "#4a9eff" },
              ].map(({ icon, label, value, href, accent }) => (
                <a
                  key={label} href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 28px", textDecoration: "none", borderRadius: 14, border: `1px solid ${accent}45`, background: `${accent}08`, transition: "all 0.25s ease", boxShadow: `0 0 0 1px ${accent}08, inset 0 1px 0 ${accent}10` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accent}55`; (e.currentTarget as HTMLAnchorElement).style.background = `${accent}10`; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 12px 40px ${accent}15`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accent}25`; (e.currentTarget as HTMLAnchorElement).style.background = `${accent}06`; (e.currentTarget as HTMLAnchorElement).style.transform = ""; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ""; }}
                >
                  <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, border: `1px solid ${accent}35`, background: `${accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: accent }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.3)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                    <p style={{ fontSize: 14, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
                  </div>
                  <span style={{ color: accent, opacity: 0.6, fontSize: 18, flexShrink: 0 }}>→</span>
                </a>
              ))}
            </div>
          </div>

        </div>
      </section>

    
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,210,255,0.08)", padding: "22px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "-0.5px" }}>
            Verif<span style={{ color: "#00d2ff" }}>AI</span>
          </span>
          <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.4)" }}>© 2025 Utkarsh Vikram Singh</p>
        </div>
      </footer>

    </div>
  );
}