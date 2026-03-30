import { config as loadEnv } from "dotenv";
import { serve } from "@hono/node-server";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(apiRoot, ".env") });
loadEnv({ path: join(apiRoot, ".env.local") });

const app = createApp();
const port = Number(process.env.PORT ?? "4000");

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on http://127.0.0.1:${info.port}`);
});
