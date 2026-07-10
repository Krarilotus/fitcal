import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const sourceDir = join(projectRoot, "node_modules", "@ffmpeg", "core", "dist", "umd");
const targetDir = join(projectRoot, "public", "vendor", "ffmpeg");

const files = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

await mkdir(targetDir, { recursive: true });

async function syncFileIfChanged(file) {
  const sourcePath = join(sourceDir, file);
  const targetPath = join(targetDir, file);
  const source = await readFile(sourcePath);
  const target = await readFile(targetPath).catch((error) => {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  });

  if (target && source.equals(target)) {
    return;
  }

  await writeFile(targetPath, source);
}

await Promise.all(files.map(syncFileIfChanged));
