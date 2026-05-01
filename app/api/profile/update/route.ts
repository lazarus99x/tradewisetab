import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, phone, avatarUrl } = body;

    const admin = getAdminClient();

    const updateData: any = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

    const { data, error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (e: any) {
    console.error("Error updating profile:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

