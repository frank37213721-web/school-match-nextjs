import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schools } from "@/db/schema";

export async function getSchoolById(id: string) {
  const [row] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  return row ?? null;
}

export async function getSchoolByPhone(phone: string) {
  const [row] = await db.select().from(schools).where(eq(schools.phone, phone)).limit(1);
  return row ?? null;
}

export async function getSchoolByName(name: string) {
  const [row] = await db.select().from(schools).where(eq(schools.name, name)).limit(1);
  return row ?? null;
}

export async function getSchoolByRegistrantEmail(email: string) {
  const [row] = await db.select().from(schools).where(eq(schools.registrantEmail, email)).limit(1);
  return row ?? null;
}

export async function getAllSchools() {
  return db.select().from(schools).where(eq(schools.role, "School")).orderBy(schools.district, schools.name);
}

