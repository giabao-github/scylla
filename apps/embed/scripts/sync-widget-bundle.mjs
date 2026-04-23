import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(scriptDirectory, "..", "dist", "widget.iife.js");
const targetPath = resolve(
  scriptDirectory,
  "..",
  "..",
  "widget",
  "public",
  "widget.js",
);

try {
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  console.log(`Synced embed bundle to ${targetPath}`);
} catch (error) {
  console.error(`Failed to sync embed bundle: ${error.message}`);
  process.exit(1);
}
