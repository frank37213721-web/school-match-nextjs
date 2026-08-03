"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getCourseById } from "@/db/queries/courses";
import {
  countActiveMatchesForCourse,
  countApprovedMatchesForCourse,
  findActiveMatch,
  getMatchById,
} from "@/db/queries/matches";
import { getSchoolById } from "@/db/queries/schools";
import { requireCourseHost, requireUser } from "@/lib/auth";
import { sendMatchApplicationEmails, sendMatchApprovedEmails, sendMatchRejectedEmail } from "@/lib/email";
import { countFilledPartnerNotes, isPastDeadline } from "@/lib/matching";

export type ApplyMatchResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

export async function applyForMatch(courseId: number): Promise<ApplyMatchResult> {
  const applicant = await requireUser();

  const course = await getCourseById(courseId);
  if (!course) return { ok: false, error: "找不到此課程。" };

  if (course.hostSchoolId === applicant.id) {
    return { ok: false, error: "📌 此為您開設的課程，無法申請配對。" };
  }

  if (await findActiveMatch(courseId, applicant.id)) {
    return { ok: false, error: "⚠️ 您已申請過此課程的媒合，且申請正在處理中或已通過！" };
  }

  if (course.closedToMatching) {
    return { ok: false, error: "⚠️ 此課程已不再徵求合作學校。" };
  }
  if (isPastDeadline(course.applicationDeadline)) {
    return { ok: false, error: "⚠️ 已超過此課程徵求合作學校的截止日期。" };
  }

  const activeCount = await countActiveMatchesForCourse(courseId);
  if (activeCount + countFilledPartnerNotes(course.partnerNotes) >= course.maxSchools) {
    return { ok: false, error: "⚠️ 此課程合作學校已滿！" };
  }

  const hostSchool = await getSchoolById(course.hostSchoolId);
  if (!hostSchool) return { ok: false, error: "找不到開課學校資料。" };

  let insertedId: number | null = null;
  try {
    const [inserted] = await db
      .insert(matches)
      .values({ courseId, partnerSchoolId: applicant.id, status: "pending", emailStatus: "pending" })
      .returning({ id: matches.id });
    insertedId = inserted?.id ?? null;
  } catch (err) {
    // Partial unique index violation — a concurrent request beat this one.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("23505") || message.toLowerCase().includes("unique")) {
      return { ok: false, error: "⚠️ 您已申請過此課程的媒合，且申請正在處理中或已通過！" };
    }
    throw err;
  }

  const { successCount, failedRecipients } = await sendMatchApplicationEmails(
    { title: course.title, timeSlots: course.timeSlots },
    hostSchool,
    applicant
  );

  if (insertedId) {
    await db
      .update(matches)
      .set({ emailStatus: failedRecipients.length === 0 ? "sent" : successCount > 0 ? "sent" : "failed" })
      .where(eq(matches.id, insertedId));
  }

  revalidatePath("/");
  revalidatePath("/dashboard/matches");

  if (failedRecipients.length > 0) {
    return {
      ok: true,
      warning: `📬 貴校對於「${hostSchool.name}」的「${course.title}」已送出配對申請。⚠️ 部分 Email 發送失敗（${failedRecipients.join("、")}）。`,
    };
  }

  return { ok: true };
}

export type MatchDecisionResult = { ok: true } | { ok: false; error: string };

export async function approveMatch(matchId: number): Promise<MatchDecisionResult> {
  const match = await getMatchById(matchId);
  if (!match) return { ok: false, error: "找不到此配對申請。" };

  await requireCourseHost(match.courseId);

  const course = await getCourseById(match.courseId);
  if (!course) return { ok: false, error: "找不到此課程。" };

  if (match.status !== "pending") {
    return { ok: false, error: "此申請已經處理過了。" };
  }

  // Re-check capacity server-side in case another application was approved first.
  const approvedCount = await countApprovedMatchesForCourse(match.courseId);
  if (approvedCount + countFilledPartnerNotes(course.partnerNotes) >= course.maxSchools) {
    return { ok: false, error: "⚠️ 此課程合作學校已滿，無法再核准新的申請。" };
  }

  const [hostSchool, applicantSchool] = await Promise.all([
    getSchoolById(course.hostSchoolId),
    getSchoolById(match.partnerSchoolId),
  ]);
  if (!hostSchool || !applicantSchool) return { ok: false, error: "找不到學校資料。" };

  await db.update(matches).set({ status: "approved", updatedAt: new Date() }).where(eq(matches.id, matchId));

  await sendMatchApprovedEmails(
    { title: course.title, timeSlots: course.timeSlots },
    hostSchool,
    applicantSchool
  );

  revalidatePath("/");
  revalidatePath("/dashboard/matches");
  return { ok: true };
}

export async function rejectMatch(matchId: number): Promise<MatchDecisionResult> {
  const match = await getMatchById(matchId);
  if (!match) return { ok: false, error: "找不到此配對申請。" };

  await requireCourseHost(match.courseId);

  const course = await getCourseById(match.courseId);
  if (!course) return { ok: false, error: "找不到此課程。" };
  if (match.status !== "pending") {
    return { ok: false, error: "此申請已經處理過了。" };
  }

  const [hostSchool, applicantSchool] = await Promise.all([
    getSchoolById(course.hostSchoolId),
    getSchoolById(match.partnerSchoolId),
  ]);
  if (!hostSchool || !applicantSchool) return { ok: false, error: "找不到學校資料。" };

  await db.update(matches).set({ status: "rejected", updatedAt: new Date() }).where(eq(matches.id, matchId));

  await sendMatchRejectedEmail(
    { title: course.title, timeSlots: course.timeSlots },
    hostSchool,
    applicantSchool.registrantEmail
  );

  revalidatePath("/");
  revalidatePath("/dashboard/matches");
  return { ok: true };
}
