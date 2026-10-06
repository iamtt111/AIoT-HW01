import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [codesArgument] = process.argv.slice(2);

if (!codesArgument) {
  console.error("Usage: node scripts/validate-county-geojson.mjs <comma-separated-CWA-area-codes>");
  process.exit(2);
}

const sourceCodes = [...new Set(codesArgument.split(",").map((code) => code.trim()).filter(Boolean))];
const geoJsonPath = resolve("public/data/taiwan-counties.geojson");
const geoJson = JSON.parse(await readFile(geoJsonPath, "utf8"));
const featureCodes = new Set(
  (geoJson.features ?? []).map((feature) => feature?.properties?.cwa_area_code).filter(Boolean),
);
const unmatched = sourceCodes.filter((code) => !featureCodes.has(`cwa-${code}`));

console.log(JSON.stringify({
  checkedAreaCodes: sourceCodes.length,
  geoJsonFeatures: geoJson.features?.length ?? 0,
  unmatchedAreaCodes: unmatched,
}, null, 2));

process.exitCode = unmatched.length > 0 ? 1 : 0;
