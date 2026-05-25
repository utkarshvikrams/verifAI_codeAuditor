export interface GitNode {
  path: string;
  type: "blob" | "tree";
  url: string;
}

export interface Issue {
  type: string;
  message: string;
  severity: "high" | "medium" | "low";
}

export interface AIResult {
  issues: {
    type: string;
    severity: "high" | "medium" | "low";
    explanation: string;
  }[];
  summary: string;
}

export type FileSeverity = "high" | "medium" | "clean" | "unknown";

export function getFileSeverity(issues: Issue[]): FileSeverity {
  if (issues.some((i) => i.severity === "high")) return "high";
  if (issues.some((i) => i.severity === "medium")) return "medium";
  return "clean";
}