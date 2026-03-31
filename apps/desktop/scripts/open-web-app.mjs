import { execSync } from "node:child_process";
import process from "node:process";

const url = process.env.DESKTOP_RENDERER_URL ?? "http://127.0.0.1:5173/";
const cmd =
  process.platform === "win32"
    ? `start "" "${url}"`
    : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
execSync(cmd, { shell: true, stdio: "inherit" });
