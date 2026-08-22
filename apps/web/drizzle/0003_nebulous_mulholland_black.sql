ALTER TABLE "videos" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "source" SET DEFAULT 'bunny'::text;--> statement-breakpoint
DROP TYPE "public"."source";--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('local', 'bunny', 'drive', 'dropbox');--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "source" SET DEFAULT 'bunny'::"public"."source";--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "source" SET DATA TYPE "public"."source" USING "source"::"public"."source";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "is_premium";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "stripe_subscription_id";