import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedAdminRoute = createRouteMatcher([
  "/admin",
  "/admin/sessions(.*)",
  "/admin/class-types(.*)",
  "/admin/bookings(.*)",
  "/admin/enquiries(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedAdminRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
