import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  varchar,
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

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  classTypeId: integer("class_type_id")
    .notNull()
    .references(() => classTypes.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  maxSeats: integer("max_seats").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled | cancelled | completed
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
