CREATE TABLE "household_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"invited_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "household_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "payment_type" text DEFAULT 'one-time';--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "payment_day" integer;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "installments" integer;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "approval_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "rejection_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_color" text DEFAULT '#6366f1';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "income_color" text DEFAULT '#10b981';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "expense_color" text DEFAULT '#ef4444';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "household_id" integer;--> statement-breakpoint
ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");