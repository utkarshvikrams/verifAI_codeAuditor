import * as acorn from "acorn";
import { Issue } from "../types";

export function checkJS(code: string): Issue[] {
  const issues: Issue[] = [];

  try {
    const ast = acorn.parse(code, { ecmaVersion: 2020, sourceType: "module" });

    function walk(node: any) {
      if (!node || typeof node !== "object") return;

      if (node.type === "CallExpression" && node.callee?.name === "eval") {
        issues.push({
          type: "Dangerous: eval()",
          message: "eval() can execute arbitrary code — serious security risk",
          severity: "high",
        });
      }

      if (node.type === "CallExpression" && node.callee?.object?.name === "console") {
        issues.push({
          type: "Debug Code Left In",
          message: `console.${node.callee?.property?.name}() should be removed before production`,
          severity: "low",
        });
      }

      if (node.type === "FunctionDeclaration" && node.async) {
        const hasAwait = JSON.stringify(node).includes('"type":"AwaitExpression"');
        if (!hasAwait) {
          issues.push({
            type: "Async Missing Await",
            message: `Function "${node.id?.name}" is async but never uses await`,
            severity: "medium",
          });
        }
      }

      for (const key of Object.keys(node)) {
        if (key === "type") continue;
        const child = node[key];
        if (Array.isArray(child)) child.forEach(walk);
        else if (child && typeof child === "object") walk(child);
      }
    }

    walk(ast);
  } catch {
  }

  return issues;
}