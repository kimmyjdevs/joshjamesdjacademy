import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  experienceLevel: z.string().trim().max(60).optional(),
  message: z.string().trim().min(5).max(2000),
  company: z.string().max(0).optional(), // honeypot — must stay empty
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Slow down — you've just sent a message. Try again in a minute." },
      { status: 429 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "That didn't come through right. Check the form and try again." },
      { status: 400 },
    );
  }

  // Honeypot tripped — pretend success, drop silently.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const { name, email, experienceLevel, message } = parsed.data;

  await db.insert(enquiries).values({
    name,
    email,
    experienceLevel: experienceLevel || null,
    message,
  });

  return NextResponse.json({ ok: true });
}
