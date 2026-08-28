import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/db";
import { googleCalendarConnection } from "@/db/schema";
import { isAllowedAdminEmail } from "@/lib/admin-auth";
import { getOAuthClient, isGoogleCalendarConfigured } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  if (!(await isAllowedAdminEmail())) {
    return NextResponse.redirect(new URL("/admin/not-authorized", req.url));
  }
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(new URL("/admin?calendar=not_configured", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/admin?calendar=error", req.url));
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      throw new Error("Google didn't return a full token set (missing refresh_token?)");
    }
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();

    // Only one connection supported — replace any existing one.
    await db.delete(googleCalendarConnection);
    await db.insert(googleCalendarConnection).values({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      connectedEmail: data.email || "unknown",
    });

    return NextResponse.redirect(new URL("/admin?calendar=connected", req.url));
  } catch (err) {
    console.error("Google Calendar OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/admin?calendar=error", req.url));
  }
}
