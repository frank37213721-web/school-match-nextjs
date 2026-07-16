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

  // Same precedence as the old admin bulk-import: code-map entries first
  // (district left blank), then district-map entries either fill in a blank
  // district on an existing by-name row or insert a new one.
  const byName = new Map<string, { code: string | null; district: string | null }>();

  for (const [code, name] of Object.entries(SCHOOL_CODE_MAP)) {
    byName.set(name, { code, district: null });
  }

  for (const [district, names] of Object.entries(SCHOOLS_BY_DISTRICT)) {
    for (const name of names) {
      const existing = byName.get(name);
      if (existing) {
        if (!existing.district) existing.district = district;
      } else {
        byName.set(name, { code: null, district });
      }
    }
  }

  const rows = [...byName.entries()].map(([name, { code, district }]) => ({
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
