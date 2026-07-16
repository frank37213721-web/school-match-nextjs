CREATE TYPE "public"."course_type" AS ENUM('部定必修', '加深加廣選修', '校訂必修', '多元選修', '彈性課程');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('週一', '週二', '週三', '週四', '週五', '週六');--> statement-breakpoint
CREATE TYPE "public"."district" AS ENUM('北一區', '北二區', '北三區', '中區', '南區', '其他');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."school_role" AS ENUM('School', 'SiteAdmin');--> statement-breakpoint
CREATE TYPE "public"."semester" AS ENUM('第一學期', '第二學期', '全學年');--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_school_id" text NOT NULL,
	"title" text NOT NULL,
	"course_type" "course_type" NOT NULL,
	"academic_year" text NOT NULL,
	"semester" "semester" NOT NULL,
	"credits" integer,
	"day_of_week" "day_of_week" NOT NULL,
	"start_hour" smallint NOT NULL,
	"end_hour" smallint NOT NULL,
	"syllabus" text,
	"plan_pdf_url" text,
	"max_students" integer DEFAULT 20 NOT NULL,
	"max_schools" integer DEFAULT 2 NOT NULL,
	"sps_min" integer,
	"sps_max" integer,
	"req_1" text,
	"req_2" text,
	"req_3" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_hour_range" CHECK ("courses"."end_hour" > "courses"."start_hour")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"partner_school_id" text NOT NULL,
	"status" "match_status" DEFAULT 'pending' NOT NULL,
	"email_status" "email_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"district" text
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"district" "district",
	"phone" text NOT NULL,
	"registrant_name" text NOT NULL,
	"registrant_extension" text,
	"registrant_email" text NOT NULL,
	"academic_director_email" text,
	"principal_email" text,
	"identity" text,
	"role" "school_role" DEFAULT 'School' NOT NULL,
	"is_host" boolean DEFAULT true NOT NULL,
	"is_partner" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_name_unique" UNIQUE("name"),
	CONSTRAINT "schools_phone_unique" UNIQUE("phone"),
	CONSTRAINT "schools_registrant_email_unique" UNIQUE("registrant_email")
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_host_school_id_schools_id_fk" FOREIGN KEY ("host_school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_partner_school_id_schools_id_fk" FOREIGN KEY ("partner_school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_host_school_id_idx" ON "courses" USING btree ("host_school_id");--> statement-breakpoint
CREATE INDEX "courses_type_day_idx" ON "courses" USING btree ("course_type","day_of_week");--> statement-breakpoint
CREATE INDEX "matches_course_id_idx" ON "matches" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "matches_partner_school_id_idx" ON "matches" USING btree ("partner_school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_active_unique" ON "matches" USING btree ("course_id","partner_school_id") WHERE "matches"."status" in ('pending','approved');