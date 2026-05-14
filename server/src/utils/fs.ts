import { existsSync, readdirSync, unlinkSync } from "fs";
import { extname, join } from "path";

export function rmShallow(dir: string): void {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      unlinkSync(join(dir, entry.name));
    }
  }
}

const ALLOWED_EXTENSIONS = new Set([".md", ".txt"]);

export function validateFile(filename: string): void {
  const ext = extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `File type ${ext} not supported, only .md or .txt files are supported`,
    );
  }
}
