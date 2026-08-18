ALTER TABLE "enquiries" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "form_type" varchar(30) DEFAULT 'general' NOT NULL;