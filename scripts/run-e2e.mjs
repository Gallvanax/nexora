import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const localData = path.resolve(process.cwd(), ".prisma-data");
fs.mkdirSync(localData, { recursive: true });
process.env.LOCALAPPDATA = localData;
process.env.APPDATA = localData;
process.env.XDG_DATA_HOME = localData;
process.env.XDG_CONFIG_HOME = localData;
process.env.CHECKPOINT_DISABLE = "1";

const { startPrismaDevServer } = await import("@prisma/dev");

async function waitForHealth(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

function runStep(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
      shell: false,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  const server = await startPrismaDevServer({
    name: "nexora-local",
    persistenceMode: "stateful",
    databasePort: 51214,
    port: 51213,
    shadowDatabasePort: 51215,
    streamsPort: 51216,
  });

  const dbUrl = server.database.connectionString.replace("localhost", "127.0.0.1");
  const nextProc = spawn(
    process.execPath,
    [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", "3000", "-H", "127.0.0.1"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      },
      shell: false,
    }
  );

  try {
    await waitForHealth("http://127.0.0.1:3000/api/health");
    console.log("Serveur Next.js prêt — lancement des tests Playwright...");
    await runStep(
      process.execPath,
      [path.resolve("node_modules/@playwright/test/cli.js"), "test"],
      {
        DATABASE_URL: dbUrl,
        E2E_BASE_URL: "http://127.0.0.1:3000",
      }
    );
  } finally {
    nextProc.kill("SIGTERM");
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
