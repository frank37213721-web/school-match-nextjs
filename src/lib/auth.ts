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
  const { data } = await auth.getSession();
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
