import "server-only";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function pngDimensions(absolutePath: string): { width: number; height: number } {
  const buffer = readFileSync(absolutePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Public URL with ?v=mtime so optimizers/browsers refetch after the file changes. */
export function publicImageSrc(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, "");
  const absolutePath = join(process.cwd(), "public", normalized);
  const v = statSync(absolutePath).mtimeMs;
  return `/${normalized}?v=${v}`;
}

/** Versioned public image URL plus native pixel dimensions (PNG). */
export function publicImageMeta(relativePath: string) {
  const normalized = relativePath.replace(/^\/+/, "");
  const absolutePath = join(process.cwd(), "public", normalized);
  const v = statSync(absolutePath).mtimeMs;
  return {
    src: `/${normalized}?v=${v}`,
    ...pngDimensions(absolutePath),
  };
}
