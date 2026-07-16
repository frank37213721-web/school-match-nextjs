import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { courses, matches, schools } from "@/db/schema";

export async function getCourseById(id: number) {
  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return row ?? null;
}

export type LobbyCourse = Awaited<ReturnType<typeof getLobbyCourses>>[number];

/** All courses with host school info and live approved/pending counts, for the public lobby. */
export async function getLobbyCourses() {
  const rows = await db
    .select({
      id: courses.id,
      hostSchoolId: courses.hostSchoolId,
      hostSchoolName: schools.name,
      hostSchoolDistrict: schools.district,
      title: courses.title,
      courseType: courses.courseType,
      academicYear: courses.academicYear,
      semester: courses.semester,
      credits: courses.credits,
      dayOfWeek: courses.dayOfWeek,
      startHour: courses.startHour,
      endHour: courses.endHour,
      syllabus: courses.syllabus,
      planPdfUrl: courses.planPdfUrl,
      maxStudents: courses.maxStudents,
      maxSchools: courses.maxSchools,
      spsMin: courses.spsMin,
      spsMax: courses.spsMax,
      req1: courses.req1,
      req2: courses.req2,
      req3: courses.req3,
    })
    .from(courses)
    .innerJoin(schools, eq(courses.hostSchoolId, schools.id));

  if (rows.length === 0) return [];

  const courseIds = rows.map((r) => r.id);
  const matchRows = await db
    .select({ courseId: matches.courseId, status: matches.status })
    .from(matches)
    .where(inArray(matches.courseId, courseIds));

  const counts = new Map<number, { approved: number; pending: number }>();
  for (const m of matchRows) {
    const c = counts.get(m.courseId) ?? { approved: 0, pending: 0 };
    if (m.status === "approved") c.approved += 1;
    else if (m.status === "pending") c.pending += 1;
    counts.set(m.courseId, c);
  }

  return rows.map((r) => ({
    ...r,
    approvedCount: counts.get(r.id)?.approved ?? 0,
    pendingCount: counts.get(r.id)?.pending ?? 0,
  }));
}

export async function getCoursesForSchool(hostSchoolId: string) {
  return db.select().from(courses).where(eq(courses.hostSchoolId, hostSchoolId));
}
