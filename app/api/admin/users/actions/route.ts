import { NextResponse } from "next/server";
import { clerkClient } from "@/lib/auth-server";
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
    const { action, userId } = body as { action: string; userId: string };
    
    if (!action || !userId) {
      return NextResponse.json({ error: "Missing action or userId" }, { status: 400 });
    }

    const client = await clerkClient();
    const supabase = getAdminClient();

    switch (action) {
      case "suspend":
        // Ban the user in Clerk
        await client.users.updateUserMetadata(userId, {
          publicMetadata: { suspended: true, suspendedAt: new Date().toISOString() },
        });
        // Update profile in Supabase
        await supabase
          .from("profiles")
          .update({ kyc_status: "suspended" })
          .eq("user_id", userId);
        return NextResponse.json({ success: true, message: "User suspended" });

      case "unsuspend":
        // Unban the user in Clerk
        await client.users.updateUserMetadata(userId, {
          publicMetadata: { suspended: false },
        });
        // Update profile in Supabase
        await supabase
          .from("profiles")
          .update({ kyc_status: "pending" })
          .eq("user_id", userId);
        return NextResponse.json({ success: true, message: "User unsuspended" });

      case "delete":
        // Delete user data from Supabase first
        await supabase.from("user_balances").delete().eq("user_id", userId);
        await supabase.from("transactions").delete().eq("user_id", userId);
        await supabase.from("user_trades").delete().eq("user_id", userId);
        await supabase.from("user_holdings").delete().eq("user_id", userId);
        await supabase.from("kyc_submissions").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("user_id", userId);
        
        // Delete user from Clerk (this also deletes all their data)
        await client.users.deleteUser(userId);
        return NextResponse.json({ success: true, message: "User deleted" });

      case "reset_password":
        // Clerk will send a password reset email
        const resetResult = await client.users.createPasswordResetToken({
          userId,
        });
        return NextResponse.json({ 
          success: true, 
          message: "Password reset email sent",
          token: resetResult.tokenId // For testing, in production you might not want to return this
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

