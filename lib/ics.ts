import { createEvent, type DateArray } from "ics";

function toDateArray(date: Date): DateArray {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

export function generateBookingIcs(params: {
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  organizerEmail: string;
}) {
  const { error, value } = createEvent({
    title: params.title,
    description: params.description,
    location: params.location,
    start: toDateArray(params.startsAt),
    startInputType: "utc",
    end: toDateArray(params.endsAt),
    endInputType: "utc",
    organizer: { name: "Josh James DJ Academy", email: params.organizerEmail },
    status: "CONFIRMED",
  });

  if (error || !value) {
    throw error || new Error("Failed to generate .ics file");
  }

  return value;
}

export function googleCalendarUrl(params: {
  title: string;
  details: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("details", params.details);
  url.searchParams.set("location", params.location);
  url.searchParams.set("dates", `${fmt(params.startsAt)}/${fmt(params.endsAt)}`);
  return url.toString();
}
