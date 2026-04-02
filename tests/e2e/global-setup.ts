import { execFileSync } from "node:child_process";
import path from "node:path";

async function globalSetup() {
  execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "e2e-prepare.mjs")], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

export default globalSetup;
