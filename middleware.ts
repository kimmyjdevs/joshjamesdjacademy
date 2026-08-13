import { clerkMiddleware, clerkClient, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedAdminRoute = createRouteMatcher([
  "/admin",
  "/admin/sessions(.*)",
  "/admin/class-types(.*)",
  "/admin/bookings(.*)",
  "/admin/enquiries(.*)",
  "/api/admin(.*)",
]);

const ADMIN_ALLOWED_EMAILS = new Set(
  (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedAdminRoute(req)) {
    const { userId } = await auth.protect();

    const user = await (await clerkClient()).users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();

    if (!email || !ADMIN_ALLOWED_EMAILS.has(email)) {
      return NextResponse.redirect(new URL("/admin/not-authorized", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
