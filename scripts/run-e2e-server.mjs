import { spawn } from "node:child_process";
import path from "node:path";
import { getE2EEnv, projectRoot } from "./e2e-env.mjs";

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "dev", "--port", "3101"], {
  cwd: projectRoot,
  env: getE2EEnv(),
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
