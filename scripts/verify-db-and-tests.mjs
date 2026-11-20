import fs from "node:fs";
import net from "node:net";
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

function waitForPort(host, port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const attempt = () => {
      const sock = net.createConnection({ host, port });
      sock.once("connect", () => {
        sock.destroy();
        resolve();
      });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(attempt, 250);
        }
      });
    };
    attempt();
  });
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
  console.log("[1/4] Démarrage de Prisma Postgres local...");
  const server = await startPrismaDevServer({
    name: "nexora-local",
    persistenceMode: "stateful",
    databasePort: 51214,
    port: 51213,
    shadowDatabasePort: 51215,
    streamsPort: 51216,
  });

  const rawConn = server.database.connectionString;
  const dbUrl = rawConn.replace("localhost", "127.0.0.1");
  const parsed = new URL(dbUrl);
  console.log(`[1/4] Attente TCP sur ${parsed.hostname}:${parsed.port}...`);
  await waitForPort(parsed.hostname, Number(parsed.port || 51214));
  console.log(`[1/4] PostgreSQL prêt sur ${parsed.hostname}:${parsed.port}.`);

  try {
    console.log("[2/4] Application des migrations Prisma sur PostgreSQL...");
    await runStep(
      process.execPath,
      [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
      { DATABASE_URL: dbUrl }
    );

    console.log("[3/4] Exécution du seed de démonstration...");
    await runStep(
      process.execPath,
      [path.resolve("node_modules/tsx/dist/cli.mjs"), "prisma/seed.ts"],
      { DATABASE_URL: dbUrl }
    );

    console.log("[4/4] Exécution des tests unitaires et d'intégration Vitest...");
    await runStep(
      process.execPath,
      [path.resolve("node_modules/vitest/vitest.mjs"), "run"],
      { DATABASE_URL: dbUrl }
    );

    console.log("SUCCÈS : DB migrée, seedée et tous les tests Vitest ont réussi.");
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
