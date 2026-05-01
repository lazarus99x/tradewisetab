import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth-server";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();

    // Get profile with service role (bypasses RLS)
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id, kyc_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: profileError.message || "Failed to check KYC status" },
        { status: 500 }
      );
    }

    // Get latest submission to find rejection reason
    const { data: latestSub } = await admin
      .from("kyc_submissions")
      .select("reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Return KYC status
    return NextResponse.json({
      isVerified: profile?.kyc_status === "verified",
      kycStatus: profile?.kyc_status || "pending",
      rejectionReason: latestSub?.reason || null,
      hasProfile: !!profile,
    });
  } catch (e: any) {
    console.error("Error in KYC check API:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to check KYC status" },
      { status: 500 }
    );
  }
}

