// Starts the Firebase Functions emulator fully detached (survives its parent
// shell), logging to /tmp/draw-a-squan-emulator.log, so it can be run from a
// one-shot tool/session without blocking or being killed on exit.
// Usage: npm run emulators:bg
import { spawn } from "child_process";
import { openSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const logFd = openSync("/tmp/draw-a-squan-emulator.log", "a");

const child = spawn(
  "firebase",
  ["emulators:start", "--only", "functions"],
  { cwd: root, detached: true, stdio: ["ignore", logFd, logFd] }
);

child.unref();
console.log(`Emulator launching (pid ${child.pid}). Log: /tmp/draw-a-squan-emulator.log`);
