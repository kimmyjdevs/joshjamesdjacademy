import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const rows = await db.query.bookings.findMany({
    where: eq(bookings.sessionId, Number(sessionId)),
    orderBy: (b, { asc }) => asc(b.customerName),
  });

  const header = ["Name", "Email", "Phone", "Seats", "Status", "Amount Paid (AUD)"];
  const lines = [header.join(",")];

  for (const b of rows) {
    lines.push(
      [
        csvEscape(b.customerName),
        csvEscape(b.customerEmail),
        csvEscape(b.customerPhone || ""),
        String(b.seats),
        b.status,
        b.amountPaidCents ? (b.amountPaidCents / 100).toFixed(2) : "",
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="session-${sessionId}-roster.csv"`,
    },
  });
}
