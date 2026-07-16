"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, matches, schools } from "@/db/schema";
import { getCourseById } from "@/db/queries/courses";
import { countActiveMatchesForCourse } from "@/db/queries/matches";
import { requireCourseHost, requireUser } from "@/lib/auth";
import { deleteCoursePlanPdf, uploadCoursePlanPdf } from "@/lib/blob";

export type ActionResult = { ok: true } | { ok: false; error: string };

const courseFieldsSchema = z.object({
  title: z.string().min(1, "請輸入課程名稱"),
  courseType: z.enum(["部定必修", "加深加廣選修", "校訂必修", "多元選修", "彈性課程"]),
  academicYear: z.string().min(1),
  semester: z.enum(["第一學期", "第二學期", "全學年"]),
  credits: z.coerce.number().int().min(0).max(4).optional(),
  dayOfWeek: z.enum(["週一", "週二", "週三", "週四", "週五", "週六"]),
  startHour: z.coerce.number().int().min(0).max(23),
  endHour: z.coerce.number().int().min(0).max(23),
  syllabus: z.string().optional(),
  maxStudents: z.coerce.number().int().min(0).default(20),
  maxSchools: z.coerce.number().int().min(0).default(2),
  spsMin: z.coerce.number().int().min(0).max(5).optional(),
  spsMax: z.coerce.number().int().min(0).max(5).optional(),
  req1: z.string().optional(),
  req2: z.string().optional(),
  req3: z.string().optional(),
});

function readCourseFields(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const isFlexible = raw.courseType === "彈性課程";
  return courseFieldsSchema.safeParse({
    ...raw,
    credits: isFlexible ? 0 : raw.credits || undefined,
    spsMin: raw.spsMin || undefined,
    spsMax: raw.spsMax || undefined,
  });
}

export async function createCourse(formData: FormData): Promise<ActionResult> {
  const school = await requireUser();
  const parsed = readCourseFields(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }
  if (parsed.data.endHour <= parsed.data.startHour) {
    return { ok: false, error: "結束時間必須晚於開始時間。" };
  }

  let planPdfUrl: string | null = null;
  const file = formData.get("planPdf");
  if (file instanceof File && file.size > 0) {
    const result = await uploadCoursePlanPdf(file, school.id);
    if ("error" in result) return { ok: false, error: result.error };
    planPdfUrl = result.url;
  }

  await db.insert(courses).values({
    hostSchoolId: school.id,
    ...parsed.data,
    planPdfUrl,
  });

  revalidatePath("/");
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard/courses/manage");
  return { ok: true };
}

export async function updateCourse(courseId: number, formData: FormData): Promise<ActionResult> {
  await requireCourseHost(courseId);
  const existing = await getCourseById(courseId);
  if (!existing) return { ok: false, error: "找不到此課程。" };

  const parsed = readCourseFields(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }
  if (parsed.data.endHour <= parsed.data.startHour) {
    return { ok: false, error: "結束時間必須晚於開始時間。" };
  }

  let planPdfUrl = existing.planPdfUrl;
  const file = formData.get("planPdf");
  if (file instanceof File && file.size > 0) {
    const result = await uploadCoursePlanPdf(file, existing.hostSchoolId);
    if ("error" in result) return { ok: false, error: result.error };
    if (existing.planPdfUrl) await deleteCoursePlanPdf(existing.planPdfUrl);
    planPdfUrl = result.url;
  }

  await db
    .update(courses)
    .set({ ...parsed.data, planPdfUrl, updatedAt: new Date() })
    .where(eq(courses.id, courseId));

  revalidatePath("/");
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard/courses/manage");
  return { ok: true };
}

export type DeleteCourseResult =
  | { ok: true }
  | { ok: false; error: string; blockingSchools?: string[] };

export async function deleteCourse(courseId: number): Promise<DeleteCourseResult> {
  await requireCourseHost(courseId);
  const existing = await getCourseById(courseId);
  if (!existing) return { ok: false, error: "找不到此課程。" };

  const activeCount = await countActiveMatchesForCourse(courseId);
  if (activeCount > 0) {
    const blockers = await db
      .select({ name: schools.name, status: matches.status })
      .from(matches)
      .innerJoin(schools, eq(matches.partnerSchoolId, schools.id))
      .where(and(eq(matches.courseId, courseId), inArray(matches.status, ["pending", "approved"])));

    return {
      ok: false,
      error: `🚫 無法刪除「${existing.title}」\n\n以下學校已送出媒合申請，請先在「配對情形」頁面處理後再刪除：`,
      blockingSchools: blockers.map((b) => `${b.name}（${b.status === "approved" ? "已核准" : "審核中"}）`),
    };
  }

  if (existing.planPdfUrl) await deleteCoursePlanPdf(existing.planPdfUrl);
  await db.delete(courses).where(eq(courses.id, courseId));

  revalidatePath("/");
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard/courses/manage");
  return { ok: true };
}
