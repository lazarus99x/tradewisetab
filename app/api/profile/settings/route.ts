import { NextResponse } from "next/server";
import { auth, clerkClient } from "@/lib/auth-server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();

    // Get profile settings
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching settings:", profileError);
    }

    // Get Clerk user for email/phone
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const defaultSettings = {
      notifications: {
        email: true,
        push: true,
        sms: false,
        tradingAlerts: true,
        kycUpdates: true,
      },
      privacy: {
        profileVisible: true,
        showBalance: false,
        shareTradingData: false,
      },
      security: {
        twoFactorEnabled: false,
        loginAlerts: true,
        sessionTimeout: 30, // minutes
      },
    };

    return NextResponse.json({
      settings: profile?.settings || defaultSettings,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      phoneNumber: clerkUser.phoneNumbers[0]?.phoneNumber,
      hasPassword: clerkUser.passwordEnabled,
      twoFactorEnabled: clerkUser.totpEnabled || clerkUser.backupCodeEnabled,
    });
  } catch (e: any) {
    console.error("Error fetching settings:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settings, email, phoneNumber } = body;

    const admin = getAdminClient();

    // Update Supabase settings
    if (settings) {
      const { data: profile } = await admin
        .from("profiles")
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();

      const currentSettings = profile?.settings || {};
      const updatedSettings = { ...currentSettings, ...settings };

      const { error: updateError } = await admin
        .from("profiles")
        .update({ settings: updatedSettings })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating settings:", updateError);
      }
    }

    // Update Clerk email/phone if provided
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    if (email && email !== clerkUser.emailAddresses[0]?.emailAddress) {
      try {
        await client.users.updateUserMetadata(userId, {
          publicMetadata: { email },
        });
      } catch (e: any) {
        console.error("Error updating email:", e);
      }
    }

    if (phoneNumber && phoneNumber !== clerkUser.phoneNumbers[0]?.phoneNumber) {
      try {
        await client.users.updateUserMetadata(userId, {
          publicMetadata: { phone: phoneNumber },
        });
      } catch (e: any) {
        console.error("Error updating phone:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Error updating settings:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

