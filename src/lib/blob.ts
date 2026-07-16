import "server-only";
import { del, put } from "@vercel/blob";

const MAX_PDF_BYTES = 2 * 1024 * 1024;

export async function uploadCoursePlanPdf(
  file: File,
  schoolId: string
): Promise<{ url: string } | { error: string }> {
  if (file.type !== "application/pdf") {
    return { error: "檔案格式必須為 PDF。" };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { error: "檔案大小不可超過 2MB。" };
  }

  const blob = await put(`course-pdfs/${schoolId}/${Date.now()}.pdf`, file, {
    access: "public",
  });
  return { url: blob.url };
}

export async function deleteCoursePlanPdf(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    console.error("[Blob delete error]", err);
  }
}
