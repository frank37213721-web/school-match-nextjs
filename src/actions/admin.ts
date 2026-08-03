"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, matches, schoolRegistry, schools } from "@/db/schema";
import { getLobbyCourses } from "@/db/queries/courses";
import { getAllMatchesDetailed } from "@/db/queries/matches";
import { getAllRegistry } from "@/db/queries/registry";
import { getSchoolByName, getSchoolByPhone } from "@/db/queries/schools";
import { requireRole } from "@/lib/auth";
import {
  buildCoursesWorkbookBuffer,
  buildMatchesWorkbookBuffer,
  buildRegistryWorkbookBuffer,
  parseRegistryWorkbook,
  type RegistryRow,
} from "@/lib/excel";
import { auth } from "@/lib/neon-auth";
import { formatTimeSlots } from "@/lib/timeSlots";
import { emailSchema, passwordSchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteSchoolCascade(schoolId: string): Promise<ActionResult> {
  await requireRole(["SiteAdmin"]);

  const hostedCourseIds = (
    await db.select({ id: courses.id }).from(courses).where(eq(courses.hostSchoolId, schoolId))
  ).map((c) => c.id);

  // neon-http has no transaction support — run sequentially instead.
  if (hostedCourseIds.length > 0) {
    await db.delete(matches).where(inArray(matches.courseId, hostedCourseIds));
  }
  await db.delete(matches).where(eq(matches.partnerSchoolId, schoolId));
  await db.delete(courses).where(eq(courses.hostSchoolId, schoolId));
  await db.delete(schools).where(eq(schools.id, schoolId));

  // schools.id IS the Neon Auth user id — without this, the login identity
  // (email/password) survives the school row being deleted, silently
  // blocking that email from ever registering again ("already exists").
  await auth.admin.removeUser({ userId: schoolId });

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

const createAdminSchema = z.object({
  name: z.string().min(1, "請輸入管理員姓名"),
  phone: z.string().min(4, "請輸入聯絡電話"),
  email: emailSchema,
  password: passwordSchema,
  identity: z.enum(["系統管理員", "課程管理員", "審核管理員"]),
});

export async function createAdminAccount(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
  identity: string;
}): Promise<ActionResult> {
  await requireRole(["SiteAdmin"]);
  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }
  const data = parsed.data;

  if (await getSchoolByPhone(data.phone)) {
    return { ok: false, error: "此聯絡電話已被使用，請更換。" };
  }

  // Use the admin plugin's createUser (not signUp.email) — signUp would swap
  // the *calling* SiteAdmin's own browser session over to the newly created
  // account, since it's designed for self-registration, not admin-provisioning.
  const { data: createData, error } = await auth.admin.createUser({
    email: data.email,
    password: data.password,
    name: data.name,
    // Better Auth's own admin plugin checks this role (separate from our
    // schools.role column) before letting a user call admin.createUser —
    // without it, admins we create here couldn't create further admins.
    role: "admin",
  });
  if (error) {
    return { ok: false, error: `建立帳號失敗：${error.message ?? "請稍後再試"}` };
  }

  const userId = createData?.user?.id;
  if (!userId) {
    return { ok: false, error: "帳號已建立，但管理員資料儲存失敗，請聯絡開發人員。" };
  }

  await db.insert(schools).values({
    id: userId,
    name: `管理部門－${data.name}`,
    phone: data.phone,
    registrantName: data.name,
    registrantEmail: data.email,
    identity: data.identity,
    role: "SiteAdmin",
    isHost: true,
    isPartner: true,
  });

  revalidatePath("/admin");
  return { ok: true };
}

// ── school_registry management ──────────────────────────────────────────────

export async function addRegistryRow(input: {
  code: string;
  name: string;
  district: string;
}): Promise<ActionResult> {
  await requireRole(["SiteAdmin"]);
  if (!input.name.trim()) return { ok: false, error: "請輸入學校名稱。" };

  await db.insert(schoolRegistry).values({
    code: input.code.trim() || null,
    name: input.name.trim(),
    district: input.district.trim() || null,
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function updateRegistryRow(
  id: number,
  input: { code: string; name: string; district: string }
): Promise<ActionResult> {
  await requireRole(["SiteAdmin"]);
  if (!input.name.trim()) return { ok: false, error: "請輸入學校名稱。" };

  await db
    .update(schoolRegistry)
    .set({
      code: input.code.trim() || null,
      name: input.name.trim(),
      district: input.district.trim() || null,
    })
    .where(eq(schoolRegistry.id, id));

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteRegistryRow(id: number): Promise<ActionResult> {
  await requireRole(["SiteAdmin"]);
  await db.delete(schoolRegistry).where(eq(schoolRegistry.id, id));
  revalidatePath("/admin");
  return { ok: true };
}

export async function bulkImportRegistryFromSeed(): Promise<{ ok: true; added: number; skipped: number }> {
  await requireRole(["SiteAdmin"]);
  const { SCHOOL_CODE_MAP, SCHOOLS_BY_DISTRICT } = await import("@/db/seedData/schoolCodes");

  const existing = await getAllRegistry();
  const existingCodes = new Set(existing.map((r) => r.code).filter((c): c is string => !!c));
  const existingCodelessNames = new Set(existing.filter((r) => !r.code).map((r) => r.name));

  // Keyed by code (not name) so schools that share an identical name across
  // different cities — e.g. 市立三民高中 exists in both 新北市 and 高雄市 —
  // each get their own row instead of the second silently overwriting the
  // first. Only codeless district-map entries fall back to a name key.
  const nameToDistrict = new Map<string, string>();
  for (const [district, names] of Object.entries(SCHOOLS_BY_DISTRICT)) {
    for (const name of names) {
      if (!nameToDistrict.has(name)) nameToDistrict.set(name, district);
    }
  }

  const rows: { name: string; code: string | null; district: string | null }[] = [];
  const codedNames = new Set<string>();
  for (const [code, name] of Object.entries(SCHOOL_CODE_MAP)) {
    codedNames.add(name);
    if (existingCodes.has(code)) continue;
    rows.push({ name, code, district: nameToDistrict.get(name) ?? null });
  }
  const addedCodelessNames = new Set<string>();
  for (const [district, names] of Object.entries(SCHOOLS_BY_DISTRICT)) {
    for (const name of names) {
      if (codedNames.has(name)) continue;
      if (existingCodelessNames.has(name) || addedCodelessNames.has(name)) continue;
      addedCodelessNames.add(name);
      rows.push({ name, code: null, district });
    }
  }

  if (rows.length > 0) {
    await db.insert(schoolRegistry).values(rows);
  }

  revalidatePath("/admin");
  return { ok: true, added: rows.length, skipped: existing.length };
}

export type RegistryDiff = {
  added: RegistryRow[];
  updated: { name: string; from: RegistryRow; to: RegistryRow }[];
  unchanged: number;
  missingFromUpload: RegistryRow[];
};

export async function previewRegistryImport(formData: FormData): Promise<RegistryDiff | { error: string }> {
  await requireRole(["SiteAdmin"]);
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "請選擇檔案。" };

  const buffer = await file.arrayBuffer();
  const parsedRows = await parseRegistryWorkbook(buffer);

  const existing = await getAllRegistry();
  const existingByName = new Map(existing.map((r) => [r.name, r]));
  const uploadedNames = new Set(parsedRows.map((r) => r.name));

  const added: RegistryRow[] = [];
  const updated: RegistryDiff["updated"] = [];
  let unchanged = 0;

  for (const row of parsedRows) {
    const current = existingByName.get(row.name);
    if (!current) {
      added.push(row);
    } else if (current.code !== row.code || current.district !== row.district) {
      updated.push({ name: row.name, from: current, to: row });
    } else {
      unchanged += 1;
    }
  }

  const missingFromUpload = existing
    .filter((r) => !uploadedNames.has(r.name))
    .map((r) => ({ code: r.code, name: r.name, district: r.district }));

  return { added, updated, unchanged, missingFromUpload };
}

export async function confirmRegistryImport(
  rows: RegistryRow[],
  deleteMissing: boolean
): Promise<{ ok: true; added: number; updated: number; deleted: number }> {
  await requireRole(["SiteAdmin"]);

  const existing = await getAllRegistry();
  const existingByName = new Map(existing.map((r) => [r.name, r]));
  const uploadedNames = new Set(rows.map((r) => r.name));

  let added = 0;
  let updated = 0;
  let deleted = 0;

  // neon-http has no transaction support — run sequentially instead.
  for (const row of rows) {
    const current = existingByName.get(row.name);
    if (!current) {
      await db.insert(schoolRegistry).values(row);
      added += 1;
    } else if (current.code !== row.code || current.district !== row.district) {
      await db
        .update(schoolRegistry)
        .set({ code: row.code, district: row.district })
        .where(eq(schoolRegistry.id, current.id));
      updated += 1;
    }
  }

  if (deleteMissing) {
    const missingIds = existing.filter((r) => !uploadedNames.has(r.name)).map((r) => r.id);
    if (missingIds.length > 0) {
      await db.delete(schoolRegistry).where(inArray(schoolRegistry.id, missingIds));
      deleted = missingIds.length;
    }
  }

  revalidatePath("/admin");
  return { ok: true, added, updated, deleted };
}

export async function exportRegistryBuffer(): Promise<Buffer> {
  await requireRole(["SiteAdmin"]);
  const rows = await getAllRegistry();
  return buildRegistryWorkbookBuffer(rows);
}

export async function exportCoursesBuffer(): Promise<Buffer> {
  await requireRole(["SiteAdmin"]);
  const rows = await getLobbyCourses();
  return buildCoursesWorkbookBuffer(
    rows.map((r) => ({
      hostSchoolName: r.hostSchoolName,
      title: r.title,
      courseType: r.courseType,
      academicYear: r.academicYear,
      semester: r.semester,
      timeSlots: formatTimeSlots(r.timeSlots),
      maxSchools: r.maxSchools,
      approvedCount: r.approvedCount,
      pendingCount: r.pendingCount,
    }))
  );
}

export async function exportMatchesBuffer(): Promise<Buffer> {
  await requireRole(["SiteAdmin"]);
  const rows = await getAllMatchesDetailed();
  return buildMatchesWorkbookBuffer(rows);
}

const adminUpdateSchoolSchema = z.object({
  name: z.string().min(1, "請輸入學校名稱"),
  district: z.enum(["", "北一區", "北二區", "北三區", "中區", "南區", "其他"]).optional(),
  phone: z.string().min(4, "電話至少需 4 碼").max(10),
  registrantName: z.string().min(1, "請輸入承辦人姓名"),
  registrantExtension: z.string().max(10).optional(),
  registrantEmail: emailSchema,
  academicDirectorEmail: z.union([emailSchema, z.literal("")]).optional(),
  principalEmail: z.union([emailSchema, z.literal("")]).optional(),
  isHost: z.boolean(),
  isPartner: z.boolean(),
});

export async function adminUpdateSchoolProfile(
  schoolId: string,
  input: z.infer<typeof adminUpdateSchoolSchema>
): Promise<ActionResult> {
  await requireRole(["SiteAdmin"]);
  const parsed = adminUpdateSchoolSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }
  const data = parsed.data;

  const existingByName = await getSchoolByName(data.name);
  if (existingByName && existingByName.id !== schoolId) {
    return { ok: false, error: "此學校名稱已被其他帳號使用。" };
  }
  const existingByPhone = await getSchoolByPhone(data.phone);
  if (existingByPhone && existingByPhone.id !== schoolId) {
    return { ok: false, error: "此電話號碼已被其他學校使用。" };
  }

  await db
    .update(schools)
    .set({
      name: data.name,
      district: (data.district || null) as (typeof schools.$inferInsert)["district"] | undefined,
      phone: data.phone,
      registrantName: data.registrantName,
      registrantExtension: data.registrantExtension || null,
      registrantEmail: data.registrantEmail,
      academicDirectorEmail: data.academicDirectorEmail || null,
      principalEmail: data.principalEmail || null,
      isHost: data.isHost,
      isPartner: data.isPartner,
    })
    .where(eq(schools.id, schoolId));

  revalidatePath("/admin");
  return { ok: true };
}
