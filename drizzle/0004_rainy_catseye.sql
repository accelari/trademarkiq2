CREATE TABLE "user_active_modules" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"module_id" varchar(50) NOT NULL,
	"stripe_subscription_item_id" varchar(255),
	"price_per_month" integer NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"canceled_at" timestamp,
	"status" varchar(50) DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "monthly_credits" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "user_active_modules" ADD CONSTRAINT "user_active_modules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_active_modules_user_idx" ON "user_active_modules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_active_modules_module_idx" ON "user_active_modules" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "user_active_modules_user_module_idx" ON "user_active_modules" USING btree ("user_id","module_id");