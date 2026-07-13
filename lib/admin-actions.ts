"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { classTypes, sessions, bookings } from "@/db/schema";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }
}

export async function createSessionAction(formData: FormData) {
  await requireAdmin();

  const classTypeId = Number(formData.get("classTypeId"));
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const location = String(formData.get("location"));
  const maxSeats = Number(formData.get("maxSeats"));
  const notes = String(formData.get("notes") || "") || null;
  const durationMinutes = Number(formData.get("durationMinutes"));

  const startsAt = new Date(`${date}T${time}:00`);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

  await db.insert(sessions).values({
    classTypeId,
    startsAt,
    endsAt,
    location,
    maxSeats,
    notes,
    status: "scheduled",
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
}

export async function duplicateSessionAction(formData: FormData) {
  await requireAdmin();
  const sessionId = Number(formData.get("sessionId"));
  const weeksAhead = Number(formData.get("weeksAhead") || 1);

  const original = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
  if (!original) return;

  const offsetMs = weeksAhead * 7 * 24 * 60 * 60 * 1000;

  await db.insert(sessions).values({
    classTypeId: original.classTypeId,
    startsAt: new Date(original.startsAt.getTime() + offsetMs),
    endsAt: new Date(original.endsAt.getTime() + offsetMs),
    location: original.location,
    maxSeats: original.maxSeats,
    notes: original.notes,
    status: "scheduled",
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/booking");
}

export async function cancelSessionAction(formData: FormData) {
  await requireAdmin();
  const sessionId = Number(formData.get("sessionId"));

  await db.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, sessionId));

  revalidatePath("/admin/sessions");
  revalidatePath("/admin/bookings");
  revalidatePath("/booking");
}

export async function createClassTypeAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name"));
  const slug = String(formData.get("slug"));
  const description = String(formData.get("description"));
  const level = String(formData.get("level"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const priceCents = Math.round(Number(formData.get("price")) * 100);
  const maxSeatsDefault = Number(formData.get("maxSeatsDefault"));

  await db.insert(classTypes).values({
    name,
    slug,
    description,
    level,
    durationMinutes,
    priceCents,
    maxSeatsDefault,
    isActive: true,
  });

  revalidatePath("/admin/class-types");
  revalidatePath("/services");
}

export async function updateClassTypeAction(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name"));
  const description = String(formData.get("description"));
  const level = String(formData.get("level"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const priceCents = Math.round(Number(formData.get("price")) * 100);
  const maxSeatsDefault = Number(formData.get("maxSeatsDefault"));
  const isActive = formData.get("isActive") === "on";

  await db
    .update(classTypes)
    .set({ name, description, level, durationMinutes, priceCents, maxSeatsDefault, isActive })
    .where(eq(classTypes.id, id));

  revalidatePath("/admin/class-types");
  revalidatePath("/services");
  revalidatePath("/booking");
}

export async function getSessionRoster(sessionId: number) {
  await requireAdmin();
  return db.query.bookings.findMany({
    where: eq(bookings.sessionId, sessionId),
    orderBy: (b, { asc }) => asc(b.customerName),
  });
}
