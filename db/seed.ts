import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { addDays, addWeeks, set } from "date-fns";
import * as schema from "./schema";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log("Seeding class types...");

  const [groupClass] = await db
    .insert(schema.classTypes)
    .values({
      slug: "group-class",
      name: "Group Class",
      description:
        "Small-group sessions covering the full curriculum — equipment, beatmatching, EQ, transitions, and reading a room. Hands on a real Pioneer setup from lesson one.",
      level: "beginner",
      durationMinutes: 120,
      priceCents: 9500,
      maxSeatsDefault: 8,
      isActive: true,
      sortOrder: 1,
    })
    .returning();

  const [privateCoaching] = await db
    .insert(schema.classTypes)
    .values({
      slug: "1-on-1-coaching",
      name: "1-on-1 Coaching",
      description:
        "Private sessions built around exactly where you're at. No waiting your turn, no pace-matching a group — just you, the decks, and direct feedback.",
      level: "all",
      durationMinutes: 90,
      priceCents: 15000,
      maxSeatsDefault: 1,
      isActive: true,
      sortOrder: 2,
    })
    .returning();

  const [clubReady] = await db
    .insert(schema.classTypes)
    .values({
      slug: "club-ready-program",
      name: "Club-Ready Program",
      description:
        "A multi-week intake taking you from bedroom to booth. Full curriculum, live practice, and a final session focused on set-building and gig prep. Limited seats per intake.",
      level: "beginner",
      durationMinutes: 150,
      priceCents: 45000,
      maxSeatsDefault: 6,
      isActive: true,
      sortOrder: 3,
    })
    .returning();

  console.log("Seeding sessions...");

  const location = "Josh James DJ Academy Studio, Fortitude Valley, Brisbane QLD";

  const makeSession = (
    classTypeId: number,
    daysFromNow: number,
    hour: number,
    minute: number,
    durationMinutes: number,
    maxSeats: number,
    notes?: string,
  ) => {
    const startsAt = set(addDays(new Date(), daysFromNow), {
      hours: hour,
      minutes: minute,
      seconds: 0,
      milliseconds: 0,
    });
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
    return {
      classTypeId,
      startsAt,
      endsAt,
      location,
      maxSeats,
      status: "scheduled" as const,
      notes,
    };
  };

  const sessionRows = [
    makeSession(groupClass.id, 5, 18, 0, 120, 8, "Bring headphones if you've got them — we've got spares if not."),
    makeSession(groupClass.id, 12, 18, 0, 120, 8, "Bring headphones if you've got them — we've got spares if not."),
    makeSession(groupClass.id, 19, 10, 0, 120, 8, "Weekend morning session. Bring headphones if you've got them."),
    makeSession(privateCoaching.id, 7, 14, 0, 90, 1, "1-on-1 — arrive 5 minutes early to settle in."),
    makeSession(privateCoaching.id, 14, 14, 0, 90, 1, "1-on-1 — arrive 5 minutes early to settle in."),
    makeSession(clubReady.id, 21, 17, 0, 150, 6, "Week 1 of the intake. Full attendance expected across the program."),
  ];

  const inserted = await db.insert(schema.sessions).values(sessionRows).returning();

  console.log("Seeding demo bookings (to create realistic availability)...");

  // Fill most seats on session[0] to test low-availability styling
  const almostFull = inserted[0];
  const demoNames = [
    ["Callum Reed", "callum@example.com"],
    ["Priya Nair", "priya@example.com"],
    ["Tane Williams", "tane@example.com"],
    ["Ruby Chen", "ruby@example.com"],
    ["Jayden Foster", "jayden@example.com"],
    ["Mia Thompson", "mia@example.com"],
  ];
  await db.insert(schema.bookings).values(
    demoNames.map(([name, email]) => ({
      sessionId: almostFull.id,
      customerName: name,
      customerEmail: email,
      seats: 1,
      status: "confirmed" as const,
      amountPaidCents: groupClass.priceCents,
      confirmedAt: new Date(),
    })),
  );

  // Sell out session[2] entirely (8 seats)
  const soldOut = inserted[2];
  await db.insert(schema.bookings).values(
    Array.from({ length: 8 }).map((_, i) => ({
      sessionId: soldOut.id,
      customerName: `Student ${i + 1}`,
      customerEmail: `student${i + 1}@example.com`,
      seats: 1,
      status: "confirmed" as const,
      amountPaidCents: groupClass.priceCents,
      confirmedAt: new Date(),
    })),
  );

  // Sell out the club-ready program (6 seats)
  const clubReadySession = inserted[5];
  await db.insert(schema.bookings).values(
    Array.from({ length: 6 }).map((_, i) => ({
      sessionId: clubReadySession.id,
      customerName: `Program Student ${i + 1}`,
      customerEmail: `program${i + 1}@example.com`,
      seats: 1,
      status: "confirmed" as const,
      amountPaidCents: clubReady.priceCents,
      confirmedAt: new Date(),
    })),
  );

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
