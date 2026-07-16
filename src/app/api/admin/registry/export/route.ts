import { NextResponse } from "next/server";
import { exportRegistryBuffer } from "@/actions/admin";

export async function GET() {
  const buffer = await exportRegistryBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=school_registry.xlsx",
    },
  });
}
