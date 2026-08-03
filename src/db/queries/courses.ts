import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { courses, courseTimeSlots, matches, schools } from "@/db/schema";
import { computeCourseSeekingStatus } from "@/lib/matching";

type TimeSlotRow = {
  dayOfWeek: (typeof courseTimeSlots.$inferSelect)["dayOfWeek"];
  startHour: number;
  endHour: number;
};

async function getTimeSlotsByCourseIds(courseIds: number[]) {
  if (courseIds.length === 0) return new Map<number, TimeSlotRow[]>();

  const rows = await db
    .select({
      courseId: courseTimeSlots.courseId,
      dayOfWeek: courseTimeSlots.dayOfWeek,
      startHour: courseTimeSlots.startHour,
      endHour: courseTimeSlots.endHour,
    })
    .from(courseTimeSlots)
    .where(inArray(courseTimeSlots.courseId, courseIds));

  const map = new Map<number, TimeSlotRow[]>();
  for (const row of rows) {
    const list = map.get(row.courseId) ?? [];
    list.push({ dayOfWeek: row.dayOfWeek, startHour: row.startHour, endHour: row.endHour });
    map.set(row.courseId, list);
  }
  return map;
}

export async function getCourseById(id: number) {
  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!row) return null;
  const slotsMap = await getTimeSlotsByCourseIds([id]);
  return { ...row, timeSlots: slotsMap.get(id) ?? [] };
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
      syllabus: courses.syllabus,
      planPdfUrl: courses.planPdfUrl,
      maxStudents: courses.maxStudents,
      maxSchools: courses.maxSchools,
      spsMin: courses.spsMin,
      spsMax: courses.spsMax,
      req1: courses.req1,
      req2: courses.req2,
      req3: courses.req3,
      partnerNotes: courses.partnerNotes,
      closedToMatching: courses.closedToMatching,
      applicationDeadline: courses.applicationDeadline,
    })
    .from(courses)
    .innerJoin(schools, eq(courses.hostSchoolId, schools.id));

  if (rows.length === 0) return [];

  const courseIds = rows.map((r) => r.id);
  const [matchRows, slotsMap] = await Promise.all([
    db
      .select({ courseId: matches.courseId, status: matches.status })
      .from(matches)
      .where(inArray(matches.courseId, courseIds)),
    getTimeSlotsByCourseIds(courseIds),
  ]);

  const counts = new Map<number, { approved: number; pending: number }>();
  for (const m of matchRows) {
    const c = counts.get(m.courseId) ?? { approved: 0, pending: 0 };
    if (m.status === "approved") c.approved += 1;
    else if (m.status === "pending") c.pending += 1;
    counts.set(m.courseId, c);
  }

  return rows.map((r) => {
    const approvedCount = counts.get(r.id)?.approved ?? 0;
    const pendingCount = counts.get(r.id)?.pending ?? 0;
    const { isFull, isSeeking } = computeCourseSeekingStatus({
      maxSchools: r.maxSchools,
      approvedCount,
      pendingCount,
      partnerNotes: r.partnerNotes,
      closedToMatching: r.closedToMatching,
      applicationDeadline: r.applicationDeadline,
    });
    return { ...r, timeSlots: slotsMap.get(r.id) ?? [], approvedCount, pendingCount, isFull, isSeeking };
  });
}

export async function getCoursesForSchool(hostSchoolId: string) {
  const rows = await db.select().from(courses).where(eq(courses.hostSchoolId, hostSchoolId));
  if (rows.length === 0) return [];
  const slotsMap = await getTimeSlotsByCourseIds(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, timeSlots: slotsMap.get(r.id) ?? [] }));
}
