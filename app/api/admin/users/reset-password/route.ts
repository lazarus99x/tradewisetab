import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * POST /api/admin/users/reset-password
 * Admin-initiated password reset for a user.
 * Sends a password reset email to the user's email.
 * Body: { user_id: string }
 */
export async function POST(request: Request) {
  try {
    // Verify the requesting user is an admin
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { user_id } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Get user's email
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", user_id)
      .single();

    if (!userProfile?.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 404 });
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://tradewisetabs.vercel.app"}/auth/callback?next=/update-password`,
    });

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${userProfile.email}`,
    });
  } catch (error: any) {
    console.error("Error in admin password reset:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}