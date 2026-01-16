CREATE TABLE "accounts" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "case_analyses" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"search_query" jsonb NOT NULL,
	"search_terms_used" jsonb DEFAULT '[]'::jsonb,
	"conflicts" jsonb DEFAULT '[]'::jsonb,
	"ai_analysis" jsonb,
	"risk_score" integer DEFAULT 0,
	"risk_level" varchar(50) DEFAULT 'low',
	"total_results_analyzed" integer DEFAULT 0,
	"alternative_names" jsonb DEFAULT '[]'::jsonb,
	"expert_strategy" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_decisions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(255) NOT NULL,
	"trademark_names" jsonb DEFAULT '[]'::jsonb,
	"countries" jsonb DEFAULT '[]'::jsonb,
	"nice_classes" jsonb DEFAULT '[]'::jsonb,
	"completeness_score" integer DEFAULT 0,
	"confidence_score" integer DEFAULT 0,
	"needs_confirmation" boolean DEFAULT false,
	"confirmed_at" timestamp,
	"confirmed_by" varchar(255),
	"raw_summary" text,
	"extracted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_events" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_steps" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(255) NOT NULL,
	"step" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"skipped_at" timestamp,
	"skip_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"transcript" text,
	"session_protocol" text,
	"duration" integer,
	"mode" varchar(50) DEFAULT 'text',
	"status" varchar(50) DEFAULT 'draft',
	"extracted_data" jsonb DEFAULT '{}'::jsonb,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"case_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recherche_history" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"keyword" varchar(255) NOT NULL,
	"trademark_type" varchar(50),
	"countries" jsonb DEFAULT '[]'::jsonb,
	"nice_classes" jsonb DEFAULT '[]'::jsonb,
	"risk_score" integer DEFAULT 0,
	"risk_level" varchar(20) DEFAULT 'low',
	"decision" varchar(50),
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "trademark_cases" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_number" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"trademark_name" varchar(255),
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trademark_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password" varchar(255),
	"image" varchar(500),
	"email_verified" timestamp,
	"is_admin" boolean DEFAULT false,
	"tour_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_analyses" ADD CONSTRAINT "case_analyses_case_id_trademark_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trademark_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_analyses" ADD CONSTRAINT "case_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_decisions" ADD CONSTRAINT "case_decisions_case_id_trademark_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trademark_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_trademark_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trademark_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_steps" ADD CONSTRAINT "case_steps_case_id_trademark_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trademark_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_case_id_trademark_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trademark_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recherche_history" ADD CONSTRAINT "recherche_history_case_id_trademark_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trademark_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recherche_history" ADD CONSTRAINT "recherche_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trademark_cases" ADD CONSTRAINT "trademark_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_analysis_case_idx" ON "case_analyses" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_analysis_user_idx" ON "case_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "case_decision_case_idx" ON "case_decisions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_event_case_idx" ON "case_events" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_event_created_at_idx" ON "case_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "case_step_case_idx" ON "case_steps" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_step_step_idx" ON "case_steps" USING btree ("step");--> statement-breakpoint
CREATE INDEX "consultation_user_idx" ON "consultations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consultation_created_at_idx" ON "consultations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "consultation_status_idx" ON "consultations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recherche_history_case_idx" ON "recherche_history" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "recherche_history_user_idx" ON "recherche_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recherche_history_created_at_idx" ON "recherche_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "case_user_idx" ON "trademark_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "case_number_idx" ON "trademark_cases" USING btree ("case_number");