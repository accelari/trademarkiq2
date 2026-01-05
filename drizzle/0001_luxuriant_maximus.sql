ALTER TABLE "case_decisions" ADD COLUMN "trademark_type" varchar(50);--> statement-breakpoint
ALTER TABLE "case_decisions" ADD COLUMN "trademark_image_url" text;--> statement-breakpoint
ALTER TABLE "case_decisions" ADD COLUMN "greeted_accordions" jsonb DEFAULT '[]'::jsonb;