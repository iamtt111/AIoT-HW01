import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const staticDirectory = join(process.cwd(), ".next", "static");
const secretNames = ["CWA_API_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_DB_URL"];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

if (!existsSync(staticDirectory)) {
  throw new Error("No production client bundle found; run npm run build first.");
}

const clientBundle = filesUnder(staticDirectory).map((path) => readFileSync(path));
for (const name of secretNames) {
  const value = process.env[name];
  if (!value) continue;
  if (clientBundle.some((file) => file.includes(Buffer.from(value)))) {
    throw new Error(`Client bundle contains ${name}. Move this value to server-only code.`);
  }
}

console.log("Client bundle contains no configured server-side secret values.");
