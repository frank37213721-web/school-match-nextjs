import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { courses, matches, schools } from "@/db/schema";

const ACTIVE_STATUSES = ["pending", "approved"] as const;

export async function countActiveMatchesForCourse(courseId: number): Promise<number> {
  const rows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.courseId, courseId), inArray(matches.status, ACTIVE_STATUSES)));
  return rows.length;
}

export async function countApprovedMatchesForCourse(courseId: number): Promise<number> {
  const rows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.courseId, courseId), eq(matches.status, "approved")));
  return rows.length;
}

export async function findActiveMatch(courseId: number, partnerSchoolId: string) {
  const [row] = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.courseId, courseId),
        eq(matches.partnerSchoolId, partnerSchoolId),
        inArray(matches.status, ACTIVE_STATUSES)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getMatchById(id: number) {
  const [row] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return row ?? null;
}

/** Matches for courses hosted by this school — the "incoming applications" tab. */
export async function getIncomingMatches(hostSchoolId: string) {
  return db
    .select({
      id: matches.id,
      status: matches.status,
      updatedAt: matches.updatedAt,
      courseId: courses.id,
      courseTitle: courses.title,
      maxSchools: courses.maxSchools,
      partnerSchoolId: schools.id,
      partnerSchoolName: schools.name,
    })
    .from(matches)
    .innerJoin(courses, eq(matches.courseId, courses.id))
    .innerJoin(schools, eq(matches.partnerSchoolId, schools.id))
    .where(eq(courses.hostSchoolId, hostSchoolId))
    .orderBy(desc(matches.createdAt));
}

/** Matches this school has applied for — the "outgoing applications" tab. */
export async function getOutgoingMatches(partnerSchoolId: string) {
  return db
    .select({
      id: matches.id,
      status: matches.status,
      updatedAt: matches.updatedAt,
      courseId: courses.id,
      courseTitle: courses.title,
      hostSchoolName: schools.name,
    })
    .from(matches)
    .innerJoin(courses, eq(matches.courseId, courses.id))
    .innerJoin(schools, eq(courses.hostSchoolId, schools.id))
    .where(eq(matches.partnerSchoolId, partnerSchoolId))
    .orderBy(desc(matches.createdAt));
}

export async function countPendingIncomingMatches(hostSchoolId: string): Promise<number> {
  const rows = await db
    .select({ id: matches.id })
    .from(matches)
    .innerJoin(courses, eq(matches.courseId, courses.id))
    .where(and(eq(courses.hostSchoolId, hostSchoolId), eq(matches.status, "pending")));
  return rows.length;
}

/** Per-applicant-school aggregate: total applications sent vs. approved — admin stats tab. */
export async function getApplicantSchoolStats() {
  const rows = await db
    .select({ schoolName: schools.name, status: matches.status })
    .from(matches)
    .innerJoin(schools, eq(matches.partnerSchoolId, schools.id));

  const byName = new Map<string, { total: number; approved: number }>();
  for (const r of rows) {
    const entry = byName.get(r.schoolName) ?? { total: 0, approved: 0 };
    entry.total += 1;
    if (r.status === "approved") entry.approved += 1;
    byName.set(r.schoolName, entry);
  }
  return [...byName.entries()].map(([schoolName, stats]) => ({ schoolName, ...stats }));
}
