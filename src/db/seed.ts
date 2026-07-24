import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  // Deferred until after dotenv has loaded .env.local — a static top-level
  // import here would be hoisted and run (throwing on missing DATABASE_URL)
  // before the config() call above ever executes.
  const { db } = await import("./index");
  const { schoolRegistry } = await import("./schema");
  const { SCHOOL_CODE_MAP, SCHOOLS_BY_DISTRICT } = await import("./seedData/schoolCodes");
  const { sql } = await import("drizzle-orm");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schoolRegistry);
  if (count > 0) {
    console.log(`school_registry already has ${count} rows — skipping seed.`);
    return;
  }

  // Keyed by code (not name) so schools that share an identical name across
  // different cities — e.g. 市立三民高中 exists in both 新北市 and 高雄市 —
  // each keep their own row instead of the second silently overwriting the
  // first. Only codeless district-map entries fall back to a name key, since
  // that's the only identifier they have.
  const byCode = new Map<string, { name: string; code: string | null; district: string | null }>();
  const nameToDistrict = new Map<string, string>();

  for (const [district, names] of Object.entries(SCHOOLS_BY_DISTRICT)) {
    for (const name of names) {
      if (!nameToDistrict.has(name)) nameToDistrict.set(name, district);
    }
  }

  for (const [code, name] of Object.entries(SCHOOL_CODE_MAP)) {
    byCode.set(code, { name, code, district: nameToDistrict.get(name) ?? null });
  }

  const codedNames = new Set([...byCode.values()].map((r) => r.name));
  const byNamelessCode = new Map<string, { name: string; code: string | null; district: string | null }>();
  for (const [district, names] of Object.entries(SCHOOLS_BY_DISTRICT)) {
    for (const name of names) {
      if (codedNames.has(name) || byNamelessCode.has(name)) continue;
      byNamelessCode.set(name, { name, code: null, district });
    }
  }

  const rows = [...byCode.values(), ...byNamelessCode.values()].map(({ name, code, district }) => ({
    name,
    code,
    district,
  }));

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(schoolRegistry).values(batch);
    inserted += batch.length;
  }

  console.log(`Seeded ${inserted} school_registry rows.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
