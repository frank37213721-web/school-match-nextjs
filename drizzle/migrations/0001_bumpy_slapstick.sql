ALTER TABLE "courses" ADD COLUMN "partner_notes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "closed_to_matching" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "application_deadline" date;