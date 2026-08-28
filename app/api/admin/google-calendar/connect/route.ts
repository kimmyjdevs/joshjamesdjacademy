import { NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/admin-auth";
import { getAuthUrl, isGoogleCalendarConfigured } from "@/lib/google-calendar";

export async function GET() {
  if (!(await isAllowedAdminEmail())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar isn't configured yet." }, { status: 503 });
  }
  return NextResponse.redirect(getAuthUrl());
}
