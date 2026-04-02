import { execFileSync } from "node:child_process";
import path from "node:path";

export function resetE2EState() {
  execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "e2e-seed.mjs")], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}
