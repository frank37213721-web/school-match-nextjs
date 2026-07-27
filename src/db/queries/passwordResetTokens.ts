import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";

export async function createPasswordResetToken(schoolId: string, token: string, expiresAt: Date) {
  await db.insert(passwordResetTokens).values({ schoolId, token, expiresAt });
}

export async function getValidPasswordResetToken(token: string) {
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.usedAt)))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function markPasswordResetTokenUsed(id: number) {
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
}
