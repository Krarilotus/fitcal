import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const sourceDir = join(projectRoot, "node_modules", "@ffmpeg", "core", "dist", "umd");
const targetDir = join(projectRoot, "public", "vendor", "ffmpeg");

const files = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

await mkdir(targetDir, { recursive: true });

await Promise.all(
  files.map((file) =>
    copyFile(join(sourceDir, file), join(targetDir, file)),
  ),
);
