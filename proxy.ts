import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({
    request: req,
  });

  const maintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const { pathname } = req.nextUrl;

  if (maintenanceMode) {
    const allowedPaths = ["/maintenance", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

    const isAllowedPath =
      allowedPaths.includes(pathname) ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/images/") ||
      pathname.startsWith("/icons/");

    if (!isAllowedPath) {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url);
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });

          res = NextResponse.next({
            request: req,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedRoutes = ["/dashboard", "/admin", "/profile"];

  const isProtected = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};