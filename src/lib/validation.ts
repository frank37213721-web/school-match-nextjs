import { z } from "zod";

/** Old app's exact rule: at least 8 characters, containing both a letter and a digit. */
export const passwordSchema = z
  .string()
  .min(8, "密碼至少 8 碼，且須同時包含英文字母與數字。")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: "密碼至少 8 碼，且須同時包含英文字母與數字。",
  });

export const emailSchema = z.string().email("Email 格式不正確。");
