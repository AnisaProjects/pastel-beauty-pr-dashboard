CREATE TABLE "ai_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by" uuid,
	"model" text NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"content_md" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pr_record_products" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pr_record_id" bigint NOT NULL,
	"category" text NOT NULL,
	"shade" text NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pr_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"fiscal_year" text NOT NULL,
	"sent_date" text,
	"bs_date" text,
	"recipient_name" text,
	"address" text,
	"phone" text,
	"is_test" boolean DEFAULT false NOT NULL,
	"notes" text,
	"total_qty" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_record_products" ADD CONSTRAINT "pr_record_products_pr_record_id_pr_records_id_fk" FOREIGN KEY ("pr_record_id") REFERENCES "public"."pr_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_records" ADD CONSTRAINT "pr_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_records" ADD CONSTRAINT "pr_records_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pr_record_products_record_cat_shade_idx" ON "pr_record_products" USING btree ("pr_record_id","category","shade");