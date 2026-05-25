import { FileSeverity } from "../types";

export function SeverityDot({ severity }: { severity: FileSeverity }) {
  if (severity === "high")
    return <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0" title="High severity issues" />;
  if (severity === "medium")
    return <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block shrink-0" title="Medium severity issues" />;
  if (severity === "clean")
    return <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shrink-0" title="No issues found" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-stone-600 inline-block shrink-0" title="Not checked" />;
}