import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { siteConfig } from "@/lib/site";

const CANONICAL_HOST = new URL(siteConfig.url).host;

const isProtectedAdminRoute = createRouteMatcher([
  "/admin",
  "/admin/sessions(.*)",
  "/admin/class-types(.*)",
  "/admin/bookings(.*)",
  "/admin/enquiries(.*)",
  "/api/admin(.*)",
]);

// Email-allowlist check happens in the (protected) layout and in each
// /api/admin route directly — not here. This edge middleware runs as a
// Netlify Edge Function (Deno, not Node), and clerkClient()'s backend API
// call isn't reliable in that runtime; it took the whole admin area down
// with 404s when tried here. auth.protect() alone is fine at the edge.
const withClerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedAdminRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // Our Clerk production instance is locked to the verified custom domain —
  // it renders a blank login screen (no error) on any other host, e.g. a
  // Netlify deploy-preview/branch permalink (*.netlify.app), which also has
  // its own separate session cookies. Bounce straight to the real domain
  // instead of leaving someone stuck looking at nothing.
  const host = req.nextUrl.hostname;
  if (host !== CANONICAL_HOST && host.endsWith(".netlify.app")) {
    const target = new URL(req.nextUrl.pathname + req.nextUrl.search, siteConfig.url);
    return NextResponse.redirect(target, 308);
  }
  return withClerk(req, event);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
