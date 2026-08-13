import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedAdminRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
