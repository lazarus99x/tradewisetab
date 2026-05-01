import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const userId = form.get("userId") as string | null;
    const keyHint = form.get("keyHint") as string | null; // e.g. id-front, id-back

    if (!file || !userId) {
      return NextResponse.json(
        { error: "Missing file or userId" },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { error: "Server not configured for uploads" },
        { status: 500 }
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${Date.now()}-${keyHint || "kyc"}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("kyc")
      .upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
    if (upErr) {
      return NextResponse.json(
        { error: upErr.message || "Upload failed" },
        { status: 400 }
      );
    }

    const { data: pub } = admin.storage.from("kyc").getPublicUrl(path);

    return NextResponse.json({ path, publicUrl: pub?.publicUrl || null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}


