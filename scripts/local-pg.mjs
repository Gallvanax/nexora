import fs from "node:fs";
import path from "node:path";

// Keep local Prisma/PGlite state inside the workspace
const localData = path.resolve(process.cwd(), ".prisma-data");
fs.mkdirSync(localData, { recursive: true });
process.env.LOCALAPPDATA = localData;
process.env.APPDATA = localData;
process.env.XDG_DATA_HOME = localData;
process.env.XDG_CONFIG_HOME = localData;

const { startPrismaDevServer } = await import("@prisma/dev");

async function main() {
  const server = await startPrismaDevServer({
    name: "nexora-local",
    persistenceMode: "stateful",
    databasePort: 51214,
    port: 51213,
    shadowDatabasePort: 51215,
    streamsPort: 51216,
  });

  console.log("POSTGRES_READY:", server.database.connectionString);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Erreur serveur PostgreSQL local :", err);
  process.exit(1);
});
