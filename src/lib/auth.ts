import "server-only";
import { redirect } from "next/navigation";
import { getCourseById } from "@/db/queries/courses";
import { getSchoolById } from "@/db/queries/schools";
import { auth } from "@/lib/neon-auth";

export type Role = "School" | "SiteAdmin";

export type CurrentSchool = {
  id: string;
  name: string;
  district: string | null;
  phone: string;
  registrantName: string;
  registrantExtension: string | null;
  registrantEmail: string;
  academicDirectorEmail: string | null;
  principalEmail: string | null;
  role: Role;
  isHost: boolean;
  isPartner: boolean;
};

function toCurrentSchool(row: NonNullable<Awaited<ReturnType<typeof getSchoolById>>>): CurrentSchool {
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    phone: row.phone,
    registrantName: row.registrantName,
    registrantExtension: row.registrantExtension,
    registrantEmail: row.registrantEmail,
    academicDirectorEmail: row.academicDirectorEmail,
    principalEmail: row.principalEmail,
    role: row.role,
    isHost: row.isHost,
    isPartner: row.isPartner,
  };
}

/** Returns the signed-in school row, or null if not signed in / no row yet. */
export async function getCurrentSchool(): Promise<CurrentSchool | null> {
  let data;
  try {
    ({ data } = await auth.getSession());
  } catch (err) {
    // On public pages (not covered by middleware.ts) the session-cache
    // cookie can be due for a refresh during a plain render, which Next.js
    // rejects outside a Server Action/Route Handler. Degrade to "unknown
    // session" for this render rather than crashing the page — the next
    // request (or the middleware-covered dashboard/admin routes) refreshes
    // the cookie normally.
    if (err instanceof Error && err.message.includes("Cookies can only be modified")) {
      return null;
    }
    throw err;
  }
  if (!data?.user) return null;

  const row = await getSchoolById(data.user.id);
  return row ? toCurrentSchool(row) : null;
}

/** Redirects to /login if the visitor isn't signed in. */
export async function requireUser(): Promise<CurrentSchool> {
  const school = await getCurrentSchool();
  if (!school) redirect("/login");
  return school;
}

/** Redirects to / if the signed-in school doesn't hold one of the given roles. */
export async function requireRole(roles: Role[]): Promise<CurrentSchool> {
  const school = await requireUser();
  if (!roles.includes(school.role)) redirect("/");
  return school;
}

/**
 * Redirects unless the signed-in school is a SiteAdmin or hosts the given course.
 */
export async function requireCourseHost(courseId: number): Promise<CurrentSchool> {
  const school = await requireUser();
  if (school.role === "SiteAdmin") return school;

  const course = await getCourseById(courseId);
  if (!course || course.hostSchoolId !== school.id) redirect("/");
  return school;
}
