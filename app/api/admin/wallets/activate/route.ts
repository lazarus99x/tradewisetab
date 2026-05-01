import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const { walletId, currency } = await req.json();
    if (!walletId || !currency) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Deactivate others for this currency
    const { error: deactivateError } = await admin
      .from("wallet_addresses")
      .update({ active: false })
      .eq("currency", currency)
      .eq("active", true);

    if (deactivateError) {
      console.error("Deactivate error:", deactivateError);
      // If it's a unique constraint error (e.g. UNIQUE(currency, active) limits false to 1 row)
      if (deactivateError.code === '23505') {
        return NextResponse.json({ 
          error: "Database constraint error: You have too many inactive wallets for this currency. Please delete old inactive wallets in your Supabase dashboard or remove the UNIQUE(currency, active) constraint." 
        }, { status: 400 });
      }
      throw deactivateError;
    }

    // 2. Activate the selected one
    const { error: activateError } = await admin
      .from("wallet_addresses")
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq("id", walletId);

    if (activateError) {
      console.error("Activate error:", activateError);
      throw activateError;
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("API error activating wallet:", e);
    return NextResponse.json(
      { error: e?.message || JSON.stringify(e) || "Failed to activate wallet" },
      { status: 500 }
    );
  }
}
