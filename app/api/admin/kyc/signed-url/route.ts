import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path } = body as { path: string };
    
    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const admin = getAdminClient();
    
    // Extract the file path from the full URL if needed
    // URLs from getPublicUrl look like: https://[project].supabase.co/storage/v1/object/public/kyc/[path]
    let filePath = path;
    
    try {
      // If it's a full URL, extract the path
      if (path.startsWith('http://') || path.startsWith('https://')) {
        const urlObj = new URL(path);
        
        // Try to match the standard Supabase storage URL pattern
        // Pattern: /storage/v1/object/public/kyc/user_id/timestamp-file.ext
        const publicMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/kyc\/(.+)$/);
        if (publicMatch) {
          filePath = publicMatch[1];
        } else {
          // Try signed URL pattern: /storage/v1/object/sign/kyc/...
          const signedMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/kyc\/(.+)$/);
          if (signedMatch) {
            filePath = signedMatch[1];
          } else {
            // Fallback: try to extract after 'kyc/'
            const kycIndex = urlObj.pathname.indexOf('kyc/');
            if (kycIndex !== -1) {
              filePath = urlObj.pathname.substring(kycIndex + 4);
            }
          }
        }
      } else if (path.includes('kyc/')) {
        // Handle relative paths like "kyc/user_id/file.jpg"
        filePath = path.split('kyc/').pop() || path;
      }
      
      // Clean up any URL encoding and remove query parameters
      filePath = decodeURIComponent(filePath.split('?')[0]);
      
      console.log("Extracted file path:", filePath, "from original:", path);
    } catch (e) {
      // If URL parsing fails, use path as-is (might already be a file path)
      console.log("URL parsing failed, using path as-is:", path);
      filePath = path.split('?')[0]; // Remove query params if any
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await admin.storage
      .from("kyc")
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error("Error creating signed URL:", error, "for path:", filePath);
      throw error;
    }
    
    return NextResponse.json({ signedUrl: data?.signedUrl || null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}

