import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, newPassword } = body as { action: string; userId: string; newPassword?: string };

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing action or userId" }, { status: 400 });
    }

    const supabase = getAdminClient();

    switch (action) {
      case "suspend":
        await supabase
          .from("profiles")
          .update({ kyc_status: "suspended", suspended: true, suspended_at: new Date().toISOString() })
          .eq("user_id", userId);
        return NextResponse.json({ success: true, message: "User suspended" });

      case "unsuspend":
        await supabase
          .from("profiles")
          .update({ kyc_status: "pending", suspended: false })
          .eq("user_id", userId);
        return NextResponse.json({ success: true, message: "User unsuspended" });

      case "delete":
        await supabase.from("user_balances").delete().eq("user_id", userId);
        await supabase.from("transactions").delete().eq("user_id", userId);
        await supabase.from("user_trades").delete().eq("user_id", userId);
        await supabase.from("user_holdings").delete().eq("user_id", userId);
        await supabase.from("kyc_submissions").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("user_id", userId);
        // Delete the auth user
        await supabase.auth.admin.deleteUser(userId);
        return NextResponse.json({ success: true, message: "User deleted" });

      case "reset_password":
        if (!newPassword || newPassword.length < 6) {
          return NextResponse.json(
            { error: "New password must be at least 6 characters" },
            { status: 400 }
          );
        }
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        );
        if (updateError) {
          console.error("Supabase password reset error:", updateError);
          return NextResponse.json(
            { error: updateError.message || "Failed to reset password" },
            { status: 500 }
          );
        }
        return NextResponse.json({
          success: true,
          message: "Password reset successfully",
        });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("Error in user action:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to perform action" },
      { status: 500 }
    );
  }
}