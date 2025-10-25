import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";

export interface FileBlob {
  path: string;
  relPath: string;
  size: number;
  content: string;
}

const DEFAULT_PATTERNS = [
  "**/*.ts",
  "**/*.tsx",
  "**/*.sol",
  "**/*.md",
  "**/*.yml",
  "**/*.yaml",
  "**/*.json",
  "**/*.graphql"
];

const IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.git/**",
  "**/*.map",
  "**/*.lock",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml"
];

export async function readProjectFiles(
  root: string,
  extraPatterns: string[] = [],
  excludePatterns: string[] = []
): Promise<FileBlob[]> {
  const patterns = DEFAULT_PATTERNS.concat(extraPatterns || []);
  const ignore = IGNORE.concat(excludePatterns || []);
  const entries = await fg(patterns, { cwd: root, ignore, dot: false });
  const files: FileBlob[] = [];
  for (const rel of entries) {
    const p = path.join(root, rel);
    try {
      const buf = await fs.readFile(p, "utf8");
      files.push({ path: p, relPath: rel, size: buf.length, content: buf });
    } catch {
      // skip unreadable
    }
  }
  return files.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

export function chunkText(text: string, maxChars = 4000): string[] {
  if (maxChars <= 0 || text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxChars));
    i += maxChars;
  }
  return chunks;
}

