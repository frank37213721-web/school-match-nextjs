import { NextResponse } from "next/server";
import { auth } from "@/lib/neon-auth";

export async function POST(request: Request) {
  await auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
