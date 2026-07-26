import "server-only";
import { eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { schoolRegistry } from "@/db/schema";

export async function getRegistryByCode(code: string) {
  const [row] = await db
    .select()
    .from(schoolRegistry)
    .where(eq(schoolRegistry.code, code))
    .limit(1);
  return row ?? null;
}

export async function searchRegistryByName(query: string, limit = 8) {
  return db
    .select()
    .from(schoolRegistry)
    .where(ilike(schoolRegistry.name, `%${query}%`))
    .orderBy(schoolRegistry.name)
    .limit(limit);
}

export async function getAllRegistry() {
  return db.select().from(schoolRegistry).orderBy(schoolRegistry.name);
}
