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
    const path = searchParams.get("path");
    
    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const admin = getAdminClient();
    
    // Extract the file path from the full URL if needed
    let filePath = decodeURIComponent(path);
    
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        const urlObj = new URL(path);
        // Extract file path after 'kyc/' - handles all URL patterns
        // /storage/v1/object/public/kyc/user_id/file.ext
        // /storage/v1/object/kyc/user_id/file.ext
        // /storage/v1/object/sign/kyc/user_id/file.ext
        const kycIndex = urlObj.pathname.indexOf('kyc/');
        if (kycIndex !== -1) {
          filePath = urlObj.pathname.substring(kycIndex + 4);
          filePath = decodeURIComponent(filePath.split('?')[0]);
        } else {
          return NextResponse.json({ error: "Invalid URL: 'kyc/' not found in path" }, { status: 400 });
        }
      } catch (e) {
        console.error("URL parsing error:", e);
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
    } else {
      // It's already a file path, use as-is (remove query params)
      filePath = decodeURIComponent(path.split('?')[0]);
    }
    
    // Remove leading slash if present
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    console.log("Extracted file path:", filePath, "from original:", path);

    // Get the directory and filename
    const lastSlash = filePath.lastIndexOf('/');
    const directory = lastSlash !== -1 ? filePath.substring(0, lastSlash) : '';
    const filenameBase = lastSlash !== -1 ? filePath.substring(lastSlash + 1) : filePath;
    
    // Clean up filename base (remove query params if any)
    const cleanFilenameBase = filenameBase.split('?')[0].split('&')[0];
    
    // List files in directory to find the actual file
    let actualFilePath = filePath;
    let data = null;
    let error = null;
    
    // First, try direct download with the path as-is
    const directResult = await admin.storage.from("kyc").download(filePath);
    if (!directResult.error && directResult.data) {
      data = directResult.data;
      actualFilePath = filePath;
    } else if (directory) {
      // If direct download fails, list files in the user's directory
      const { data: files, error: listError } = await admin.storage
        .from("kyc")
        .list(directory, { limit: 100 });
      
      if (!listError && files) {
        // Find file that starts with the filename base or exact match
        const matchingFile = files.find(f => 
          f.name === cleanFilenameBase || 
          f.name.startsWith(cleanFilenameBase) ||
          cleanFilenameBase.includes(f.name)
        );
        if (matchingFile) {
          actualFilePath = `${directory}/${matchingFile.name}`;
          console.log("Found matching file:", actualFilePath);
          
          // Try downloading the matched file
          const matchResult = await admin.storage.from("kyc").download(actualFilePath);
          if (!matchResult.error && matchResult.data) {
            data = matchResult.data;
            error = null;
          } else {
            error = matchResult.error;
          }
        }
      }
      
      // If still not found and no extension, try common extensions
      if (error && !actualFilePath.includes('.')) {
        const extensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
        for (const ext of extensions) {
          const tryPath = `${directory}/${cleanFilenameBase}.${ext}`;
          const tryResult = await admin.storage.from("kyc").download(tryPath);
          if (!tryResult.error && tryResult.data) {
            actualFilePath = tryPath;
            data = tryResult.data;
            error = null;
            console.log("Found file with extension:", ext);
            break;
          }
        }
      }
    }
    
    // If still no data and we have an error, use the error from direct download
    if (!data && directResult.error) {
      error = directResult.error;
    }

    if (error) {
      console.error("Error downloading file:", error, "for path:", actualFilePath);
      return NextResponse.json({ 
        error: error.message || "File not found",
        attemptedPath: actualFilePath,
        originalPath: filePath
      }, { status: 404 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: "File not found",
        attemptedPath: actualFilePath,
        originalPath: filePath
      }, { status: 404 });
    }
    
    // Use actual file path for content type detection
    filePath = actualFilePath;

    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer();
    
    // Determine content type from file extension
    let contentType = "application/octet-stream";
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') contentType = "image/jpeg";
    else if (ext === 'png') contentType = "image/png";
    else if (ext === 'webp') contentType = "image/webp";
    else if (ext === 'pdf') contentType = "application/pdf";

    // Return the file with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filePath.split('/').pop()}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: any) {
    console.error("Error serving document:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to serve document" },
      { status: 500 }
    );
  }
}

