"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { getRegistryByCode } from "@/db/queries/registry";
import { getSchoolByName, getSchoolByPhone } from "@/db/queries/schools";
import { requireUser } from "@/lib/auth";
import { auth } from "@/lib/neon-auth";
import { emailSchema, passwordSchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

const registerSchema = z.object({
  schoolCode: z.string().min(1, "請輸入學校代碼"),
  district: z
    .enum(["", "北一區", "北二區", "北三區", "中區", "南區", "其他"])
    .optional(),
  registrantName: z.string().min(1, "請輸入承辦人姓名"),
  registrantExtension: z.string().max(10).optional(),
  phone: z.string().min(4, "電話至少需 4 碼").max(10),
  registrantEmail: emailSchema,
  academicDirectorEmail: emailSchema,
  principalEmail: emailSchema,
  password: passwordSchema,
});

export async function lookupSchoolByCode(
  code: string
): Promise<{ name: string; district: string | null } | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const row = await getRegistryByCode(trimmed);
  if (!row) return null;
  return { name: row.name, district: row.district };
}

export async function registerSchool(input: {
  schoolCode: string;
  district?: string;
  registrantName: string;
  registrantExtension?: string;
  phone: string;
  registrantEmail: string;
  academicDirectorEmail: string;
  principalEmail: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }
  const data = parsed.data;

  const registryEntry = await lookupSchoolByCode(data.schoolCode);
  if (!registryEntry) {
    return { ok: false, error: "請輸入有效的學校代碼" };
  }

  if (await getSchoolByName(registryEntry.name)) {
    return { ok: false, error: "此學校已經註冊過帳號了" };
  }
  if (await getSchoolByPhone(data.phone)) {
    return { ok: false, error: "此電話號碼已被其他學校使用" };
  }

  const { data: signUpData, error } = await auth.signUp.email({
    email: data.registrantEmail,
    password: data.password,
    name: data.registrantName,
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("already") || message.includes("exist")) {
      return { ok: false, error: "此電子郵件已經被使用過了。" };
    }
    return { ok: false, error: `註冊過程發生錯誤：${error.message ?? "請稍後再試"}` };
  }

  const userId = signUpData?.user?.id ?? (await auth.getSession()).data?.user?.id;
  if (!userId) {
    return { ok: false, error: "帳號已建立，但學校資料儲存失敗，請聯絡管理員。" };
  }

  await db
    .insert(schools)
    .values({
      id: userId,
      name: registryEntry.name,
      district: (data.district || registryEntry.district || null) as
        | (typeof schools.$inferInsert)["district"]
        | undefined,
      phone: data.phone,
      registrantName: data.registrantName,
      registrantExtension: data.registrantExtension || null,
      registrantEmail: data.registrantEmail,
      academicDirectorEmail: data.academicDirectorEmail,
      principalEmail: data.principalEmail,
      identity: "學校承辦人",
      role: "School",
      isHost: true,
      isPartner: true,
    })
    .onConflictDoUpdate({
      target: schools.id,
      set: {
        name: registryEntry.name,
        phone: data.phone,
        registrantName: data.registrantName,
        registrantEmail: data.registrantEmail,
      },
    });

  return { ok: true };
}

const loginSchema = z.object({
  phone: z.string().min(1, "請輸入帳號"),
  password: z.string().min(1, "請輸入密碼"),
});

export type LoginResult =
  | { ok: true; role: "School" | "SiteAdmin"; name: string }
  | { ok: false; error: string };

export async function loginSchool(input: { phone: string; password: string }): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "請輸入帳號與密碼。" };
  }

  const school = await getSchoolByPhone(parsed.data.phone);
  if (!school) {
    return { ok: false, error: "帳號或密碼錯誤，請重新確認。" };
  }

  const { error } = await auth.signIn.email({
    email: school.registrantEmail,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "帳號或密碼錯誤，請重新確認。" };
  }

  return { ok: true, role: school.role, name: school.name };
}

const updateProfileSchema = z.object({
  name: z.string().min(1, "請輸入學校名稱"),
  district: z.enum(["", "北一區", "北二區", "北三區", "中區", "南區", "其他"]).optional(),
  registrantName: z.string().min(1).optional(),
  registrantExtension: z.string().max(10).optional(),
  registrantEmail: emailSchema.optional(),
  academicDirectorEmail: z.union([emailSchema, z.literal("")]).optional(),
  principalEmail: z.union([emailSchema, z.literal("")]).optional(),
});

export async function updateSchoolProfile(input: {
  name: string;
  district?: string;
  registrantName?: string;
  registrantExtension?: string;
  registrantEmail?: string;
  academicDirectorEmail?: string;
  principalEmail?: string;
}): Promise<ActionResult> {
  const school = await requireUser();
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }
  const data = parsed.data;

  await db
    .update(schools)
    .set({
      name: data.name,
      district: (data.district || null) as (typeof schools.$inferInsert)["district"] | undefined,
      registrantName: data.registrantName,
      registrantExtension: data.registrantExtension || null,
      academicDirectorEmail: data.academicDirectorEmail || null,
      principalEmail: data.principalEmail || null,
    })
    .where(eq(schools.id, school.id));

  return { ok: true };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "請輸入目前密碼"),
  newPassword: passwordSchema,
});

export async function changeSchoolPassword(
  input: z.infer<typeof changePasswordSchema>
): Promise<ActionResult> {
  await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }

  const { error } = await auth.changePassword({
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    revokeOtherSessions: false,
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("invalid") || message.includes("incorrect") || message.includes("password")) {
      return { ok: false, error: "目前密碼不正確。" };
    }
    return { ok: false, error: "密碼更新失敗，請稍後再試。" };
  }

  return { ok: true };
}

export async function requestSchoolPasswordReset(phone: string): Promise<ActionResult> {
  const school = await getSchoolByPhone(phone.trim());
  if (school) {
    await auth.requestPasswordReset({
      email: school.registrantEmail,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
  }
  // Always return the same message regardless of whether the phone matched,
  // to avoid revealing which accounts exist.
  return { ok: true };
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export async function resetSchoolPassword(
  input: z.infer<typeof resetPasswordSchema>
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入資料有誤。" };
  }

  const { error } = await auth.resetPassword({
    newPassword: parsed.data.newPassword,
    token: parsed.data.token,
  });

  if (error) {
    return { ok: false, error: "重設連結無效或已過期，請重新申請。" };
  }

  return { ok: true };
}
