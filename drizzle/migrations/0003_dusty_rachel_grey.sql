CREATE TABLE "course_time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"start_hour" smallint NOT NULL,
	"end_hour" smallint NOT NULL,
	CONSTRAINT "course_time_slots_hour_range" CHECK ("course_time_slots"."end_hour" > "course_time_slots"."start_hour")
);
--> statement-breakpoint
INSERT INTO "course_time_slots" ("course_id", "day_of_week", "start_hour", "end_hour")
SELECT "id", "day_of_week", "start_hour", "end_hour" FROM "courses";--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_hour_range";--> statement-breakpoint
DROP INDEX "courses_type_day_idx";--> statement-breakpoint
ALTER TABLE "course_time_slots" ADD CONSTRAINT "course_time_slots_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_time_slots_course_id_idx" ON "course_time_slots" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "courses_type_idx" ON "courses" USING btree ("course_type");--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "day_of_week";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "start_hour";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "end_hour";