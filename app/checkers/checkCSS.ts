import { Issue } from "../types";

export function checkCSS(code: string): Issue[] {
  const issues: Issue[] = [];

  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      type: "Mismatched Braces",
      message: `${openBraces} opening { but ${closeBraces} closing } — your CSS is broken`,
      severity: "high",
    });
  }

  const importantCount = (code.match(/!important/gi) || []).length;
  if (importantCount > 3) {
    issues.push({
      type: "Too Many !important",
      message: `!important used ${importantCount} times — indicates broken or conflicting styles`,
      severity: "high",
    });
  }

  const emptyProps = code.match(/[\w-]+\s*:\s*;/g) || [];
  if (emptyProps.length > 0) {
    issues.push({
      type: "Incomplete Properties",
      message: `${emptyProps.length} CSS property/properties with no value — incomplete code`,
      severity: "medium",
    });
  }

  const emptyRules = code.match(/[a-zA-Z#.][^{}]*\{\s*\}/g) || [];
  if (emptyRules.length > 0) {
    issues.push({
      type: "Empty CSS Rules",
      message: `${emptyRules.length} empty rule(s) — selectors with no styles inside`,
      severity: "medium",
    });
  }

  const rules = code.match(/\{[^}]+\}/g) || [];
  let duplicateCount = 0;
  rules.forEach((rule) => {
    const props = rule.match(/[\w-]+\s*:/g) || [];
    const seen = new Set<string>();
    props.forEach((prop) => {
      const clean = prop.replace(/\s*:/, "").trim();
      if (seen.has(clean)) duplicateCount++;
      seen.add(clean);
    });
  });
  if (duplicateCount > 0) {
    issues.push({
      type: "Duplicate Properties",
      message: `${duplicateCount} duplicate CSS property/properties — one will override the other`,
      severity: "medium",
    });
  }

  return issues;
}