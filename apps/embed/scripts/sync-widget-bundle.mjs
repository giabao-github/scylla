import { access, copyFile, mkdir } from "node:fs/promises";
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
  await access(sourcePath);
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  console.log(`Synced embed bundle to ${targetPath}`);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(`Source file not found: ${sourcePath}`);
  } else {
    console.error(`Failed to sync embed bundle: ${error.message}`);
  }
  process.exit(1);
}
