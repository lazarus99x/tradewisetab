import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function POST(request: Request) {
  try {
    const { userId, email, fullName, password } = await request.json();

    if (!userId || !email || !fullName || !password) {
      return NextResponse.json(
        { error: "Missing required fields: userId, email, fullName, password" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Step 1: Auto-confirm the user via Supabase Auth Admin API
    // This sets email_confirmed_at so the user can sign in without email verification
    try {
      await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    } catch (confirmErr: any) {
      console.error("Admin confirm user error:", confirmErr?.message || confirmErr);
      // Non-fatal — proceed anyway; user may already be auto-confirmed
    }

    // Step 2: Create profile in profiles table (store password for admin visibility)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      // Try insert WITH password first (requires the password column)
      const insertPayload: Record<string, any> = {
        user_id: userId,
        full_name: fullName,
        email: email,
        role: "user",
        kyc_status: "unverified",
        password: password,
      };

      const { error: profileError } = await admin.from("profiles").insert(insertPayload);

      if (profileError) {
        console.error("Error creating profile with password:", profileError);
        // Retry without password (column may not exist yet)
        const { error: retryError } = await admin.from("profiles").insert({
          user_id: userId,
          full_name: fullName,
          email: email,
          role: "user",
          kyc_status: "unverified",
        });
        if (retryError) {
          return NextResponse.json(
            { error: retryError.message || "Failed to create profile" },
            { status: 500 }
          );
        }
      } else {
        // Password stored successfully - now also update the password in Auth
        // so the user can sign in with it
        try {
          await admin.auth.admin.updateUserById(userId, {
            password: password,
          });
        } catch (pwErr: any) {
          console.error("Auth password update error:", pwErr?.message || pwErr);
          // Non-fatal — user was created with password already via signUp
        }
      }
    }

    // Step 3: Create balance record
    const { data: existingBalance } = await admin
      .from("user_balances")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingBalance) {
      const { error: balanceError } = await admin.from("user_balances").insert({
        user_id: userId,
        account_balance: 0,
        profit_balance: 0,
        trading_balance: 0,
        funding_balance: 0,
        balance: 0,
      });

      if (balanceError) {
        console.error("Error creating balance:", balanceError);
        // Non-fatal — balance will be created on first dashboard load
      }
    }

    return NextResponse.json({
      success: true,
      message: "User confirmed and profile created",
    });
  } catch (e: any) {
    console.error("Error in confirm-user:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to confirm user" },
      { status: 500 }
    );
  }
}