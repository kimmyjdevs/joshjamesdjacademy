import { NextRequest, NextResponse } from "next/server";
import { asc, gt } from "drizzle-orm";
import { db } from "@/db";
import { enquiries } from "@/db/schema";

const MAX_RESULTS = 500;

export async function GET(req: NextRequest) {
  const apiKey = process.env.ENQUIRY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const providedKey = authHeader.replace(/^Bearer\s+/i, "");
  if (providedKey !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  if (sinceParam && isNaN(since!.getTime())) {
    return NextResponse.json({ error: "Invalid 'since' timestamp" }, { status: 400 });
  }

  const rows = await db.query.enquiries.findMany({
    where: since ? gt(enquiries.createdAt, since) : undefined,
    orderBy: asc(enquiries.createdAt),
    limit: MAX_RESULTS,
  });

  const data = rows.map((e) => ({
    id: String(e.id),
    name: e.name,
    email: e.email,
    phone: e.phone,
    message: e.message,
    form_type: e.formType,
    experience_level: e.experienceLevel,
    submitted_at: e.createdAt.toISOString(),
  }));

  return NextResponse.json(data);
}
