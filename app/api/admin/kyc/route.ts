import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("kyc_submissions")
      .select("id, user_id, status, reason, documents, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ submissions: data || [] });
  } catch (e: any) {
    console.error("KYC Fetch Error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load KYC" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, reason } = body as { id: string; action: "approve" | "reject"; reason?: string };
    if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 });

    const admin = getAdminClient();
    if (action === "approve") {
      const { data: sub, error: e1 } = await admin
        .from("kyc_submissions")
        .update({ status: "verified", reason: null })
        .eq("id", id)
        .select("user_id")
        .maybeSingle();
      if (e1) throw e1;
      if (!sub) throw new Error("KYC submission not found or could not be updated");
      
      // Check if profile exists first
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("user_id", sub.user_id)
        .maybeSingle();
      
      // Update or insert profile with verified status
      if (existingProfile) {
        const { error: updateError } = await admin
          .from("profiles")
          .update({ kyc_status: "verified" })
          .eq("user_id", sub.user_id);
        if (updateError) throw updateError;
      } else {
        // Create profile if it doesn't exist
        const { error: insertError } = await admin
          .from("profiles")
          .insert({ 
            user_id: sub.user_id, 
            kyc_status: "verified",
            full_name: "User",
            email: ""
          });
        if (insertError) throw insertError;
      }
      
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      const { data: sub, error: e1 } = await admin
        .from("kyc_submissions")
        .update({ status: "rejected", reason: reason || null })
        .eq("id", id)
        .select("user_id")
        .maybeSingle();
      if (e1) throw e1;
      if (!sub) throw new Error("KYC submission not found or could not be updated");
      
      // Check if profile exists first
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("user_id", sub.user_id)
        .maybeSingle();
      
      // Update or insert profile with rejected status
      if (existingProfile) {
        const { error: updateError } = await admin
          .from("profiles")
          .update({ kyc_status: "rejected" })
          .eq("user_id", sub.user_id);
        if (updateError) throw updateError;
      } else {
        // Create profile if it doesn't exist
        const { error: insertError } = await admin
          .from("profiles")
          .insert({ 
            user_id: sub.user_id, 
            kyc_status: "rejected",
            full_name: "User",
            email: ""
          });
        if (insertError) throw insertError;
      }
      
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update KYC" }, { status: 500 });
  }
}


