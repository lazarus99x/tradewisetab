import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * POST /api/admin/users/force-reset-password
 * Admin directly sets a new password for any user (bypasses email).
 * Body: { user_id: string, new_password: string }
 */
export async function POST(request: Request) {
  try {
    // Verify admin
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", adminUser.id).single();
    if (profile?.role?.toLowerCase() !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { user_id, new_password } = await request.json();
    if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    if (!new_password || new_password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    // Use service role client to directly update the user's password
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await serviceClient.auth.admin.updateUserById(user_id, { password: new_password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Error in force password reset:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}