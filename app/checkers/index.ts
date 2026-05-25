import { Issue } from "../types";
import { checkJS } from "./checkJS";
import { checkCSS } from "./checkCSS";
import { checkHTML } from "./checkHTML";

export function checkFile(path: string, code: string): Issue[] {
  if (/\.(js|jsx|ts|tsx)$/.test(path)) return checkJS(code);
  if (/\.html?$/.test(path)) return checkHTML(code);
  if (/\.css$/.test(path)) return checkCSS(code);
  return [];
}

export function isCheckable(path: string): boolean {
  return /\.(js|jsx|ts|tsx|html?|css)$/.test(path);
}