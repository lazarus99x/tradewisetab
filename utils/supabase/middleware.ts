import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/videos",
  // Admin sign-in is public so unauthenticated admins can log in
  "/admin/sign-in",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublic = publicRoutes.some(pattern => pathname === pattern || pathname.startsWith(pattern + "/"));
  const isNextInternal = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  // --- Admin route protection (runs before general auth check) ---
  if (pathname.startsWith("/admin")) {
    // /admin/sign-in is always accessible
    if (pathname === "/admin/sign-in") {
      return supabaseResponse;
    }

    // Must be logged in first
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/sign-in";
      return NextResponse.redirect(url);
    }

    // Must have admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = profile?.role?.toLowerCase() === "admin";

    if (!isAdmin) {
      // Signed-in but not an admin → send back to their dashboard
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // User is a verified admin — allow through
    return supabaseResponse;
  }

  // --- General auth protection for all other private routes ---
  if (!user && !isPublic && !isNextInternal) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
