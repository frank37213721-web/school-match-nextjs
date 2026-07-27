import {
  pgTable,
  pgEnum,
  serial,
  integer,
  smallint,
  boolean,
  text,
  timestamp,
  date,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const districtEnum = pgEnum("district", [
  "北一區",
  "北二區",
  "北三區",
  "中區",
  "南區",
  "其他",
]);
export const schoolRoleEnum = pgEnum("school_role", ["School", "SiteAdmin"]);
export const courseTypeEnum = pgEnum("course_type", [
  "部定必修",
  "加深加廣選修",
  "校訂必修",
  "多元選修",
  "彈性課程",
]);
export const semesterEnum = pgEnum("semester", ["第一學期", "第二學期", "全學年"]);
export const dayOfWeekEnum = pgEnum("day_of_week", [
  "週一",
  "週二",
  "週三",
  "週四",
  "週五",
  "週六",
]);
export const matchStatusEnum = pgEnum("match_status", ["pending", "approved", "rejected"]);
export const emailStatusEnum = pgEnum("email_status", ["pending", "sent", "failed"]);

// 1:1 with Neon Auth user — the school itself is the login principal.
export const schools = pgTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  district: districtEnum("district"),
  phone: text("phone").notNull().unique(),
  registrantName: text("registrant_name").notNull(),
  registrantExtension: text("registrant_extension"),
  registrantEmail: text("registrant_email").notNull().unique(),
  academicDirectorEmail: text("academic_director_email"),
  principalEmail: text("principal_email"),
  identity: text("identity"),
  role: schoolRoleEnum("role").notNull().default("School"),
  isHost: boolean("is_host").notNull().default(true),
  isPartner: boolean("is_partner").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    hostSchoolId: text("host_school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    courseType: courseTypeEnum("course_type").notNull(),
    academicYear: text("academic_year").notNull(),
    semester: semesterEnum("semester").notNull(),
    credits: integer("credits"),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    startHour: smallint("start_hour").notNull(),
    endHour: smallint("end_hour").notNull(),
    syllabus: text("syllabus"),
    planPdfUrl: text("plan_pdf_url"),
    maxStudents: integer("max_students").notNull().default(20),
    maxSchools: integer("max_schools").notNull().default(2),
    spsMin: integer("sps_min"),
    spsMax: integer("sps_max"),
    req1: text("req_1"),
    req2: text("req_2"),
    req3: text("req_3"),
    // Free-text notes for partner schools the host already lined up outside
    // the platform — one slot per maxSchools, "" for a slot still open to
    // public applications. Not tied to real accounts or the matches table.
    partnerNotes: text("partner_notes").array().notNull().default([]),
    // When true, this course stops soliciting applications in the lobby
    // regardless of remaining slots.
    closedToMatching: boolean("closed_to_matching").notNull().default(false),
    // After this date, the course also stops soliciting applications even
    // if slots remain open. Null = no deadline.
    applicationDeadline: date("application_deadline", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("courses_host_school_id_idx").on(t.hostSchoolId),
    index("courses_type_day_idx").on(t.courseType, t.dayOfWeek),
    check("courses_hour_range", sql`${t.endHour} > ${t.startHour}`),
  ]
);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    partnerSchoolId: text("partner_school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    status: matchStatusEnum("status").notNull().default("pending"),
    emailStatus: emailStatusEnum("email_status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("matches_course_id_idx").on(t.courseId),
    index("matches_partner_school_id_idx").on(t.partnerSchoolId),
    // Allows re-applying after a rejection: only pending/approved matches are
    // considered "active" and block a duplicate application.
    uniqueIndex("matches_active_unique")
      .on(t.courseId, t.partnerSchoolId)
      .where(sql`${t.status} in ('pending','approved')`),
  ]
);

// Decoupled lookup table used only for registration autofill + admin management.
export const schoolRegistry = pgTable("school_registry", {
  id: serial("id").primaryKey(),
  code: text("code"),
  name: text("name").notNull(),
  district: text("district"),
});

// Our own password-reset tokens, emailed via Resend — bypasses Neon Auth's
// built-in reset-email delivery (unreliable on its Shared/Custom SMTP
// provider as of this app's Beta version).
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_tokens_school_id_idx").on(t.schoolId)]
);

export const schoolsRelations = relations(schools, ({ many }) => ({
  hostedCourses: many(courses),
  matchesAsPartner: many(matches),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  hostSchool: one(schools, { fields: [courses.hostSchoolId], references: [schools.id] }),
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  course: one(courses, { fields: [matches.courseId], references: [courses.id] }),
  partnerSchool: one(schools, {
    fields: [matches.partnerSchoolId],
    references: [schools.id],
  }),
}));
