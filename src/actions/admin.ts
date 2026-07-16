"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses, matches, schoolRegistry, schools } from "@/db/schema";
import { getAllRegistry } from "@/db/queries/registry";
import { getSchoolByPhone } from "@/db/queries/schools";
import { requireRole } from "@/lib/auth";
import { buildRegistryWorkbookBuffer, parseRegistryWorkbook, type RegistryRow } from "@/lib/excel";
import { auth } from "@/lib/neon-auth";
import { emailSchema, passwordSchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteSchoolCascade(schoolId: string): Promise<ActionResult> {
  await requireRole(["SiteAdmin"]);

  const hostedCourseIds = (
    await db.select({ id: courses.id }).from(courses).where(eq(courses.hostSchoolId, schoolId))
  ).map((c) => c.id);

  await db.transaction(async (tx) => {
    if (hostedCourseIds.length > 0) {
      await tx.delete(matches).where(inArray(matches.courseId, hostedCourseIds));
    }
    await tx.delete(matches).where(eq(matches.partnerSchoolId, schoolId));
    await tx.delete(courses).where(eq(courses.hostSchoolId, schoolId));
    await tx.delete(schools).where(eq(schools.id, schoolId));
  });

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

  const { data: signUpData, error } = await auth.signUp.email({
    email: data.email,
    password: data.password,
    name: data.name,
  });
  if (error) {
    return { ok: false, error: `建立帳號失敗：${error.message ?? "請稍後再試"}` };
  }

  const userId = signUpData?.user?.id ?? (await auth.getSession()).data?.user?.id;
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
  const existingNames = new Set(existing.map((r) => r.name));

  const byName = new Map<string, { code: string | null; district: string | null }>();
  for (const [code, name] of Object.entries(SCHOOL_CODE_MAP)) {
    if (!existingNames.has(name)) byName.set(name, { code, district: null });
  }
  for (const [district, names] of Object.entries(SCHOOLS_BY_DISTRICT)) {
    for (const name of names) {
      if (existingNames.has(name)) continue;
      const entry = byName.get(name);
      if (entry) entry.district = entry.district ?? district;
      else byName.set(name, { code: null, district });
    }
  }

  const rows = [...byName.entries()].map(([name, { code, district }]) => ({ name, code, district }));
  if (rows.length > 0) {
    await db.insert(schoolRegistry).values(rows);
  }

  revalidatePath("/admin");
  return { ok: true, added: rows.length, skipped: existingNames.size };
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

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const current = existingByName.get(row.name);
      if (!current) {
        await tx.insert(schoolRegistry).values(row);
        added += 1;
      } else if (current.code !== row.code || current.district !== row.district) {
        await tx
          .update(schoolRegistry)
          .set({ code: row.code, district: row.district })
          .where(eq(schoolRegistry.id, current.id));
        updated += 1;
      }
    }

    if (deleteMissing) {
      const missingIds = existing.filter((r) => !uploadedNames.has(r.name)).map((r) => r.id);
      if (missingIds.length > 0) {
        await tx.delete(schoolRegistry).where(inArray(schoolRegistry.id, missingIds));
        deleted = missingIds.length;
      }
    }
  });

  revalidatePath("/admin");
  return { ok: true, added, updated, deleted };
}

export async function exportRegistryBuffer(): Promise<Buffer> {
  await requireRole(["SiteAdmin"]);
  const rows = await getAllRegistry();
  return buildRegistryWorkbookBuffer(rows);
}
