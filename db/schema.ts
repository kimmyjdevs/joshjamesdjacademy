import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  varchar,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const classTypes = pgTable("class_types", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  level: varchar("level", { length: 20 }).notNull().default("beginner"), // beginner | intermediate | all
  durationMinutes: integer("duration_minutes").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("aud"),
  maxSeatsDefault: integer("max_seats_default").notNull().default(8),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  // When false, cancelling a session for this class type does NOT trigger an
  // automatic Stripe refund — Josh handles those cases manually (e.g. deposits,
  // custom programs with a stated no-refund policy).
  refundable: boolean("refundable").notNull().default(true),
  // Optional booking window for seasonal/time-limited offerings (e.g. school
  // holiday programs). Null means no restriction on that side of the window.
  availableFrom: timestamp("available_from", { withTimezone: true }),
  availableUntil: timestamp("available_until", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A standing weekly timetable, e.g. "UpBeat, Mon–Sat, every hour from 10am,
 * last start 5pm, no end date". Bookable sessions are generated from it on a
 * rolling window (see lib/schedules.ts), so it effectively runs forever.
 * All times are Brisbane local (no daylight saving, so a fixed +10:00).
 */
export const weeklySchedules = pgTable("weekly_schedules", {
  id: serial("id").primaryKey(),
  classTypeId: integer("class_type_id")
    .notNull()
    .references(() => classTypes.id),
  // Comma-separated ISO-ish weekdays, 0 = Sunday … 6 = Saturday. e.g. "1,2,3,4,5,6"
  daysOfWeek: varchar("days_of_week", { length: 20 }).notNull(),
  firstStartTime: varchar("first_start_time", { length: 5 }).notNull(), // "10:00"
  lastStartTime: varchar("last_start_time", { length: 5 }).notNull(), // "17:00"
  // Gap between one slot's start and the next's (independent of duration).
  intervalMinutes: integer("interval_minutes").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  maxSeats: integer("max_seats").notNull(),
  location: text("location").notNull(),
  notes: text("notes"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null = runs forever
  // Last Brisbane date slots have been generated for — lets generation be a
  // cheap no-op on most page loads, and means a slot Josh deletes (day off)
  // is never re-created.
  generatedUntil: date("generated_until"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  classTypeId: integer("class_type_id")
    .notNull()
    .references(() => classTypes.id),
  // Set when this session was generated from a weekly schedule.
  scheduleId: integer("schedule_id").references(() => weeklySchedules.id, { onDelete: "set null" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  maxSeats: integer("max_seats").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled | cancelled | completed
  notes: text("notes"),
  // Set the first time a booking is confirmed for this session — lets us
  // update the same Google Calendar event on later bookings instead of
  // creating a duplicate, and lets us skip sessions nobody's booked yet.
  googleCalendarEventId: text("google_calendar_event_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Makes schedule generation idempotent if two requests race.
  uniqueIndex("sessions_schedule_slot_unique").on(t.scheduleId, t.startsAt),
]);

export const googleCalendarConnection = pgTable("google_calendar_connection", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiryDate: timestamp("expiry_date", { withTimezone: true }).notNull(),
  connectedEmail: text("connected_email").notNull(),
  // Which of the connected account's calendars bookings sync to. Defaults to
  // the account's main calendar until Josh picks a different one from the admin UI.
  calendarId: text("calendar_id").notNull().default("primary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  seats: integer("seats").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | confirmed | cancelled | expired
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPaidCents: integer("amount_paid_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  experienceLevel: text("experience_level"),
  // general | holiday_program | 1on1 | group_class | corporate
  formType: varchar("form_type", { length: 30 }).notNull().default("general"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClassType = typeof classTypes.$inferSelect;
export type NewClassType = typeof classTypes.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
