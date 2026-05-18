import "dotenv/config";
import { execSync } from "node:child_process";
import { getDirectDatabaseUrl } from "./db-direct-url";

const directUrl = getDirectDatabaseUrl();

console.log("Running migrations on direct connection…");
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: directUrl },
});

console.log("Seeding demo users and data…");
execSync("npx tsx prisma/seed.ts", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: directUrl },
});

console.log("Done.");
