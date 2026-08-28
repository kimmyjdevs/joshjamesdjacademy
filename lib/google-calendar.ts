import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnection, sessions, bookings, classTypes } from "@/db/schema";
import { siteConfig } from "@/lib/site";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${siteConfig.url}/api/admin/google-calendar/callback`;

export function isGoogleCalendarConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function getOAuthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Google Calendar isn't configured (missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).");
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token back even on re-connect
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function getConnection() {
  return db.query.googleCalendarConnection.findFirst();
}

export async function disconnectGoogleCalendar() {
  await db.delete(googleCalendarConnection);
}

export async function setSelectedCalendar(calendarId: string) {
  const connection = await getConnection();
  if (!connection) return;
  await db
    .update(googleCalendarConnection)
    .set({ calendarId, updatedAt: new Date() })
    .where(eq(googleCalendarConnection.id, connection.id));
}

/**
 * Lists the connected account's calendars, for the "which calendar?" picker in
 * admin. Never throws — an existing connection made before this feature shipped
 * won't have the calendarlist scope yet, and a bad/expired token shouldn't be
 * able to take the whole Dashboard down with it.
 */
export async function listAvailableCalendars() {
  try {
    const client = await getAuthorizedClient();
    if (!client) return [];

    const calendar = google.calendar({ version: "v3", auth: client });
    const { data } = await calendar.calendarList.list();
    return (data.items || [])
      .filter((c): c is typeof c & { id: string } => Boolean(c.id))
      .map((c) => ({
        id: c.id,
        summary: c.summary || c.id,
        primary: Boolean(c.primary),
      }));
  } catch (err) {
    console.error("Failed to list Google calendars:", err);
    return [];
  }
}

async function getAuthorizedClient() {
  const connection = await getConnection();
  if (!connection || !isGoogleCalendarConfigured()) return null;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiryDate.getTime(),
  });

  // googleapis auto-refreshes the access token on demand and emits the new
  // one here — persist it so we're not re-refreshing on every single call.
  client.on("tokens", (tokens) => {
    db.update(googleCalendarConnection)
      .set({
        ...(tokens.access_token ? { accessToken: tokens.access_token } : {}),
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        ...(tokens.expiry_date ? { expiryDate: new Date(tokens.expiry_date) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnection.id, connection.id))
      .catch((err) => console.error("Failed to persist refreshed Google token:", err));
  });

  return client;
}

/**
 * Creates or updates the Google Calendar event for a session, reflecting
 * current confirmed bookings. Safe to call any time a session's booking
 * state changes — no-ops quietly if Calendar isn't configured/connected,
 * since this should never be the thing that breaks a real booking.
 */
export async function syncSessionToCalendar(sessionId: number) {
  try {
    const client = await getAuthorizedClient();
    if (!client) return;
    const connection = await getConnection();
    const calendarId = connection?.calendarId || "primary";

    const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
    if (!session) return;
    const classType = await db.query.classTypes.findFirst({ where: eq(classTypes.id, session.classTypeId) });
    if (!classType) return;

    const allBookings = await db.query.bookings.findMany({ where: eq(bookings.sessionId, sessionId) });
    const confirmed = allBookings.filter((b) => b.status === "confirmed");
    const totalSeats = confirmed.reduce((sum, b) => sum + b.seats, 0);

    if (confirmed.length === 0) {
      // No paying customers (yet, or anymore) — don't clutter the calendar.
      if (session.googleCalendarEventId) {
        await deleteCalendarEvent(sessionId);
      }
      return;
    }

    const attendeeLines = confirmed
      .map((b) => `- ${b.customerName} (${b.customerEmail})${b.seats > 1 ? ` x${b.seats}` : ""}`)
      .join("\n");

    const description = [
      `${totalSeats} / ${session.maxSeats} seats booked`,
      session.notes ? `\nNotes: ${session.notes}` : "",
      `\nStudents:\n${attendeeLines}`,
    ].join("");

    const calendar = google.calendar({ version: "v3", auth: client });
    const eventBody = {
      summary: `${classType.name} — Josh James DJ Academy`,
      location: session.location,
      description,
      start: { dateTime: session.startsAt.toISOString() },
      end: { dateTime: session.endsAt.toISOString() },
    };

    if (session.googleCalendarEventId) {
      await calendar.events.update({
        calendarId,
        eventId: session.googleCalendarEventId,
        requestBody: eventBody,
      });
    } else {
      const created = await calendar.events.insert({ calendarId, requestBody: eventBody });
      if (created.data.id) {
        await db
          .update(sessions)
          .set({ googleCalendarEventId: created.data.id })
          .where(eq(sessions.id, sessionId));
      }
    }
  } catch (err) {
    console.error(`Google Calendar sync failed for session ${sessionId}:`, err);
  }
}

/**
 * Creates a short-lived dummy event on whichever calendar is currently
 * selected, and hands back Google's own link to it — lets Josh/Kim click
 * straight through and confirm with their own eyes which calendar bookings
 * are actually landing on, rather than trusting a name in a dropdown.
 */
export async function sendTestCalendarEvent(): Promise<
  { ok: true; htmlLink: string; calendarSummary: string } | { ok: false; error: string }
> {
  try {
    const client = await getAuthorizedClient();
    if (!client) return { ok: false, error: "Google Calendar isn't connected." };
    const connection = await getConnection();
    const calendarId = connection?.calendarId || "primary";

    const calendar = google.calendar({ version: "v3", auth: client });

    let calendarSummary = calendarId;
    try {
      const { data } = await calendar.calendarList.get({ calendarId });
      calendarSummary = data.summary || calendarId;
    } catch {
      // Non-fatal — still create the event, just show the raw ID instead of a name.
    }

    const start = new Date(Date.now() + 5 * 60 * 1000);
    const end = new Date(start.getTime() + 15 * 60 * 1000);

    const { data: event } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: "Test event — Josh James DJ Academy sync",
        description:
          'Created by the "Send test event" button in the admin Dashboard to confirm which ' +
          "calendar bookings sync to. Safe to delete.",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });

    if (!event.htmlLink) {
      return { ok: false, error: "Event was created but Google didn't return a link to it." };
    }
    return { ok: true, htmlLink: event.htmlLink, calendarSummary };
  } catch (err) {
    console.error("Test calendar event failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error." };
  }
}

/** Removes a session's calendar event entirely — e.g. the session was cancelled. */
export async function deleteCalendarEvent(sessionId: number) {
  try {
    const client = await getAuthorizedClient();
    if (!client) return;
    const connection = await getConnection();
    const calendarId = connection?.calendarId || "primary";

    const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
    if (!session?.googleCalendarEventId) return;

    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.delete({ calendarId, eventId: session.googleCalendarEventId }).catch(() => {
      // Already deleted on Google's side, or never existed — fine either way.
    });

    await db.update(sessions).set({ googleCalendarEventId: null }).where(eq(sessions.id, sessionId));
  } catch (err) {
    console.error(`Google Calendar event delete failed for session ${sessionId}:`, err);
  }
}
