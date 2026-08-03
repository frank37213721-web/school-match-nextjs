import { NextResponse } from "next/server";
import { exportCoursesBuffer } from "@/actions/admin";

export async function GET() {
  const buffer = await exportCoursesBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=courses.xlsx",
    },
  });
}
