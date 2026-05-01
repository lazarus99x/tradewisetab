import { NextResponse } from "next/server";
import { auth, clerkClient } from "@/lib/auth-server";

export async function GET(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Prefer claims for performance; fallback to user read if needed
  const role = (sessionClaims as any)?.publicMetadata?.role;
  const destination = role === "admin" ? "/admin" : "/dashboard";
  return NextResponse.redirect(new URL(destination, request.url));
}
