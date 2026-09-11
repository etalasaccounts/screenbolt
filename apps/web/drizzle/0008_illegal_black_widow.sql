ALTER TABLE "videos" ADD COLUMN "pin_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "pin" text;