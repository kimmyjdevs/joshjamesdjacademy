CREATE TABLE "weekly_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_type_id" integer NOT NULL,
	"days_of_week" varchar(20) NOT NULL,
	"first_start_time" varchar(5) NOT NULL,
	"last_start_time" varchar(5) NOT NULL,
	"interval_minutes" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"max_seats" integer NOT NULL,
	"location" text NOT NULL,
	"notes" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"generated_until" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "schedule_id" integer;--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_class_type_id_class_types_id_fk" FOREIGN KEY ("class_type_id") REFERENCES "public"."class_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_schedule_id_weekly_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_schedule_slot_unique" ON "sessions" USING btree ("schedule_id","starts_at");