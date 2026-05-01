import { NextResponse } from "next/server";
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const all = searchParams.get("all") === "true";
    
    const admin = getAdminClient();
    
    if (all) {
      // Return all profiles
      const { data: profiles, error: profilesError } = await admin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        return NextResponse.json(
          { error: profilesError.message || "Failed to load profiles" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        profiles: profiles || [],
      });
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || "Failed to load profile" },
        { status: 500 }
      );
    }

    const { data: balance, error: balanceError } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (balanceError) {
      console.error("Error loading balance:", balanceError);
    }

    return NextResponse.json({
      profile: profile || null,
      balance: balance || null,
    });
  } catch (e: any) {
    console.error("Error in profile API:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, fullName, email } = body;
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const admin = getAdminClient();
    
    // Check if profile exists
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({
        profile: existingProfile,
        message: "Profile already exists",
      });
    }

    // Create profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .insert({
        user_id: userId,
        full_name: fullName || "No name",
        email: email || "",
        kyc_status: "pending",
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || "Failed to create profile" },
        { status: 500 }
      );
    }

    // Create balance
    const { error: balanceError } = await admin
      .from("user_balances")
      .insert({
        user_id: userId,
        account_balance: 0,
        profit_balance: 0,
        funding_balance: 0,
      });

    if (balanceError) {
      console.error("Error creating balance:", balanceError);
    }

    const { data: balance } = await admin
      .from("user_balances")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return NextResponse.json({
      profile: profile || null,
      balance: balance || null,
      message: "Profile created successfully",
    });
  } catch (e: any) {
    console.error("Error creating profile:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to create profile" },
      { status: 500 }
    );
  }
}

