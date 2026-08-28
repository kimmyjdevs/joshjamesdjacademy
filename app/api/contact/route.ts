import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";

const FORM_TYPES = ["general", "holiday_program", "1on1", "group_class", "corporate"] as const;

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  formType: z.enum(FORM_TYPES).optional(),
  experienceLevel: z.string().trim().max(60).optional(),
  message: z.string().trim().min(2, "Message is too short.").max(2000),
  // Honeypot — bots fill every field. Deliberately NOT constrained to empty
  // here: a schema-level max(0) turned any accidental browser autofill of it
  // into a hard "check the form" rejection for real visitors. Any content is
  // instead checked after parsing succeeds, below, and just quietly no-ops.
  hp_confirm: z.string().optional(),
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
    // Surface the actual field/reason instead of a generic message — this
    // silently swallowed real submissions before with no way to tell why.
    const firstIssue = parsed.error.issues[0];
    const detail = firstIssue ? ` (${firstIssue.path.join(".") || "field"}: ${firstIssue.message})` : "";
    return NextResponse.json(
      { error: `That didn't come through right. Check the form and try again.${detail}` },
      { status: 400 },
    );
  }

  // Honeypot tripped — pretend success, drop silently.
  if (parsed.data.hp_confirm) {
    return NextResponse.json({ ok: true });
  }

  const { name, email, phone, formType, experienceLevel, message } = parsed.data;

  await db.insert(enquiries).values({
    name,
    email,
    phone: phone || null,
    formType: formType || "general",
    experienceLevel: experienceLevel || null,
    message,
  });

  return NextResponse.json({ ok: true });
}
