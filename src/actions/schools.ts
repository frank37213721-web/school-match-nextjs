"use server";

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { getRegistryByCode, searchRegistryByName } from "@/db/queries/registry";
import { getSchoolByName, getSchoolByPhone, getSchoolByRegistrantEmail } from "@/db/queries/schools";
import {
  createPasswordResetToken,
  getValidPasswordResetToken,
  markPasswordResetTokenUsed,
} from "@/db/queries/passwordResetTokens";
import { requireUser } from "@/lib/auth";
import { auth } from "@/lib/neon-auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { maskName } from "@/lib/mask";
import { emailSchema, passwordSchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

// schools.district is a strict enum, but school_registry.district is free
// text (e.g. "高雄市", seeded from various sources) — never assign it
// directly without checking it's actually one of the enum's values, or the
// insert throws and leaves an orphaned Neon Auth identity behind (the
// identity is created before this insert and can't be rolled back without
// an admin session, which doesn't exist during self-registration).
const VALID_SCHOOL_DISTRICTS = new Set(["北一區", "北二區", "北三區", "中區", "南區", "其他"]);
function sanitizeDistrict(value: string | null | undefined): string | null {
  return value && VALID_SCHOOL_DISTRICTS.has(value) ? value : null;
}

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

export async function lookupSchoolByCode(code: string): Promise<{
  name: string;
  district: string | null;
  registered: boolean;
  maskedRegistrantName: string | null;
} | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const row = await getRegistryByCode(trimmed);
  if (!row) return null;

  const existing = await getSchoolByName(row.name);
  return {
    name: row.name,
    district: row.district,
    registered: !!existing,
    maskedRegistrantName: existing ? maskName(existing.registrantName) : null,
  };
}

/** Name-substring search over the school registry, for autocomplete inputs. */
export async function searchSchoolNames(
  query: string
): Promise<{ name: string; district: string | null }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];
  const rows = await searchRegistryByName(trimmed);
  return rows.map((r) => ({ name: r.name, district: r.district }));
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

  try {
    await db
      .insert(schools)
      .values({
        id: userId,
        name: registryEntry.name,
        district: (data.district || sanitizeDistrict(registryEntry.district)) as
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
  } catch (err) {
    // The Neon Auth login identity was already created above — if saving
    // the school row fails (bad district value, DB constraint, etc.), roll
    // it back so the email doesn't end up permanently orphaned and blocked
    // from ever registering again.
    await auth.admin.removeUser({ userId }).catch(() => {});
    console.error("[registerSchool] rolled back orphaned auth identity after insert failure:", err);
    return { ok: false, error: "註冊過程發生錯誤，請稍後再試一次。" };
  }

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

  // registrantEmail is also the school's actual Neon Auth login email (the
  // phone number typed at login is just resolved to this email under the
  // hood) — if it changes, both places must change together, or login by
  // phone will start failing silently. Neon Auth doesn't expose a
  // self-service email-change endpoint we can rely on here (it needs a
  // plugin-level config we don't control, and would otherwise require an
  // email-verification round trip), so we update its own user table
  // directly instead.
  const emailChanged = data.registrantEmail && data.registrantEmail !== school.registrantEmail;
  if (emailChanged) {
    const existing = await getSchoolByRegistrantEmail(data.registrantEmail!);
    if (existing && existing.id !== school.id) {
      return { ok: false, error: "此 Email 已被其他學校使用。" };
    }
    await db.execute(sql`UPDATE neon_auth."user" SET email = ${data.registrantEmail} WHERE id = ${school.id}`);
  }

  try {
    await db
      .update(schools)
      .set({
        name: data.name,
        district: (data.district || null) as (typeof schools.$inferInsert)["district"] | undefined,
        registrantName: data.registrantName,
        registrantExtension: data.registrantExtension || null,
        registrantEmail: data.registrantEmail,
        academicDirectorEmail: data.academicDirectorEmail || null,
        principalEmail: data.principalEmail || null,
      })
      .where(eq(schools.id, school.id));
  } catch (err) {
    if (emailChanged) {
      // Keep the login email and the displayed email in sync — if this
      // insert fails, undo the Neon Auth email change too.
      await db
        .execute(sql`UPDATE neon_auth."user" SET email = ${school.registrantEmail} WHERE id = ${school.id}`)
        .catch(() => {});
    }
    console.error("[updateSchoolProfile] failed to save profile:", err);
    return { ok: false, error: "更新失敗，請稍後再試一次。" };
  }

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

// Password reset runs entirely through our own token + Resend email instead
// of Neon Auth's built-in reset-email delivery (unreliable on its Shared and
// Custom SMTP providers as of this app's Beta version). We only bypass the
// emailing step — the actual password update goes through Neon Auth's own
// unauthenticated /reset-password endpoint (auth.resetPassword), not the
// admin API: auth.admin.setUserPassword requires an authenticated admin
// session (it 401s — see ADMIN_ERROR_CODES-backed adminMiddleware), which
// doesn't exist in a "forgot password" flow. To let auth.resetPassword
// accept our own token, we also register it in Neon Auth's own internal
// verification table under the same "reset-password:<token>" identifier
// it uses internally, mirroring what its own request-password-reset
// endpoint would have written.
export async function requestSchoolPasswordReset(phone: string): Promise<ActionResult> {
  const school = await getSchoolByPhone(phone.trim());
  if (school) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await createPasswordResetToken(school.id, token, expiresAt);
    await db.execute(sql`
      INSERT INTO neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${`reset-password:${token}`}, ${school.id}, ${expiresAt}, now(), now())
    `);

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(school.registrantEmail, resetUrl);
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

  const tokenRow = await getValidPasswordResetToken(parsed.data.token);
  if (!tokenRow) {
    return { ok: false, error: "重設連結無效或已過期，請重新申請。" };
  }

  const { error } = await auth.resetPassword({
    newPassword: parsed.data.newPassword,
    token: parsed.data.token,
  });
  if (error) {
    return { ok: false, error: "重設連結無效或已過期，請重新申請。" };
  }
  await markPasswordResetTokenUsed(tokenRow.id);

  return { ok: true };
}
