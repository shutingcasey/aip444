import fs from "fs";
import { execFileSync } from "child_process";

const MAX_FILE_LINES = 200;
const MAX_OUTPUT_CHARS = 8000;

export function readFileTool(
  filePath: string,
  startLine?: number,
  endLine?: number
): string {
  if (!fs.existsSync(filePath)) {
    return `Error: File not found: ${filePath}`;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const start = startLine ? Math.max(startLine - 1, 0) : 0;
  const end = endLine ? Math.min(endLine, lines.length) : Math.min(lines.length, MAX_FILE_LINES);

  const selected = lines.slice(start, end);

  const numbered = selected
    .map((line, index) => `${start + index + 1}: ${line}`)
    .join("\n");

  if (numbered.length > MAX_OUTPUT_CHARS) {
    return numbered.slice(0, MAX_OUTPUT_CHARS) + "\n[Truncated]";
  }

  return numbered;
}

export function ripgrepTool(searchPattern: string): string {
  try {
    const result = execFileSync("rg", [searchPattern, "--line-number"], {
      encoding: "utf-8",
    });

    if (result.length > MAX_OUTPUT_CHARS) {
      return result.slice(0, MAX_OUTPUT_CHARS) + "\n[Truncated]";
    }

    return result || "No matches found.";
  } catch {
    return "No matches found.";
  }
}