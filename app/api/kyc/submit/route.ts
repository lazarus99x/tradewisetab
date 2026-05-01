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

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documents } = body;

    if (!documents || !documents.id_front || !documents.id_back || !documents.selfie || !documents.address_proof) {
      return NextResponse.json({ error: "All documents are required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Ensure profile exists first (required for foreign key in kyc_submissions)
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        { user_id: userId, kyc_status: "pending" },
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("Profile creation/update error:", profileError);
      return NextResponse.json(
        { error: "Failed to initialize user profile for KYC" },
        { status: 500 }
      );
    }

    // 2. Insert KYC submission using service role (bypasses RLS)
    const { data: kycData, error: kycError } = await admin
      .from("kyc_submissions")
      .insert({
        user_id: userId,
        documents: documents,
        status: "pending",
      })
      .select();

    if (kycError) {
      console.error("KYC submission error:", kycError);
      return NextResponse.json(
        { error: kycError.message || "Failed to save KYC submission" },
        { status: 500 }
      );
    }

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail the request - KYC submission was successful
    }

    return NextResponse.json({ 
      success: true, 
      data: kycData[0] 
    });
  } catch (e: any) {
    console.error("Error in KYC submit API:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to submit KYC" },
      { status: 500 }
    );
  }
}

