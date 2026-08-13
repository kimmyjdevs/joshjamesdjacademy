import { currentUser } from "@clerk/nextjs/server";

const ADMIN_ALLOWED_EMAILS = new Set(
  (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export async function isAllowedAdminEmail() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  return Boolean(email && ADMIN_ALLOWED_EMAILS.has(email));
}
