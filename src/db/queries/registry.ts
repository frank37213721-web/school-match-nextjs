import "server-only";
import { eq } from "drizzle-orm";
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

export async function getAllRegistry() {
  return db.select().from(schoolRegistry).orderBy(schoolRegistry.name);
}
