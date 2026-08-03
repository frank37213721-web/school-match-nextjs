"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  GraduationCap,
  ListChecks,
  Pin,
  School,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplyMatchDialog } from "./ApplyMatchDialog";
import type { LobbyCourse } from "@/db/queries/courses";
import { formatTimeSlots } from "@/lib/timeSlots";

export function CourseCard({
  course,
  currentSchoolId,
  isLoggedIn,
}: {
  course: LobbyCourse;
  currentSchoolId: string | null;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const isHost = currentSchoolId === course.hostSchoolId;
  const partnerNotes = course.partnerNotes.filter((n) => n.trim().length > 0);
  const filledCount = course.approvedCount + partnerNotes.length;

  let statusLabel: string;
  let statusClass: string;
  let statusDotClass: string;
  if (!course.isSeeking) {
    statusLabel = course.isFull ? "名額已滿" : "已不再徵求";
    statusClass = "bg-status-full/10 text-status-full border-status-full";
    statusDotClass = "bg-status-full";
  } else if (filledCount > 0) {
    statusLabel = `${filledCount}/${course.maxSchools} 所`;
    statusClass = "bg-status-partial/10 text-status-partial border-status-partial";
    statusDotClass = "bg-status-partial";
  } else {
    statusLabel = `開放中 ${filledCount}/${course.maxSchools}`;
    statusClass = "bg-status-open/10 text-status-open border-status-open";
    statusDotClass = "bg-status-open";
  }

  const requirements = [course.req1, course.req2, course.req3].filter(
    (r): r is string => !!r
  );

  return (
    <div className="card-shadow rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-elevation-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={`badge-course-${course.courseType} mb-2 inline-block rounded-sm px-2 py-0.5 text-xs font-semibold`}
          >
            {course.courseType}
          </span>
          <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">{course.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm">
            <School className="size-3.5 text-primary" />
            <span className="font-semibold text-primary">{course.hostSchoolName}</span>
            {course.hostSchoolDistrict && (
              <span className="ml-1 text-xs text-muted-foreground">· {course.hostSchoolDistrict}</span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="size-3.5" />
            {course.academicYear} 學年度 · {course.semester}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {formatTimeSlots(course.timeSlots)}　已配對 {course.approvedCount}{" "}
            所　待審 {course.pendingCount} 所
          </p>
        </div>
        <Badge variant="outline" className={`${statusClass} gap-1.5`}>
          <span className={`size-1.5 rounded-full ${statusDotClass}`} />
          {statusLabel}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {expanded ? "收起" : "詳情"}
        </Button>

        {isHost ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Pin className="size-3.5" />
            此為您開設的課程，無法申請配對。
          </p>
        ) : isLoggedIn ? (
          <Button size="sm" disabled={!course.isSeeking} onClick={() => setApplyOpen(true)}>
            {!course.isSeeking ? (
              <>
                <Ban className="size-4" />
                {course.isFull ? "名額已滿" : "已不再徵求"}
              </>
            ) : (
              "申請配對 →"
            )}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => router.push("/login")}>
            登入後申請配對
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                學年度／學期：{course.academicYear} 學年度 {course.semester}
              </p>
              <p className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                課程種類：{course.courseType}
              </p>
              <p className="flex items-center gap-1.5">
                <Target className="size-3.5 text-muted-foreground" />
                學分數：{course.credits ?? 0} 學分
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                開課時間：{formatTimeSlots(course.timeSlots)}
              </p>
              <p className="flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                跨校學生上限：{course.maxStudents} 人
              </p>
              {(!!course.spsMin || !!course.spsMax) && (
                <p className="flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-muted-foreground" />
                  每校學生人數：{course.spsMin ?? 0} ~ {course.spsMax ?? 0} 人
                </p>
              )}
            </div>
            <div>
              <p className="flex items-center gap-1.5">
                <School className="size-3.5 text-muted-foreground" />
                合作學校上限：{course.maxSchools} 所
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-muted-foreground" />
                目前：已配對 {course.approvedCount} 所　待審 {course.pendingCount} 所
                {partnerNotes.length > 0 && `　已敲定 ${partnerNotes.length} 所`}
              </p>
              {course.applicationDeadline && (
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5 text-muted-foreground" />
                  合作邀請截止：{course.applicationDeadline}
                </p>
              )}
              {partnerNotes.length > 0 && (
                <p className="flex items-start gap-1.5">
                  <School className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>已敲定合作學校：{partnerNotes.join("、")}</span>
                </p>
              )}
              {course.planPdfUrl && (
                <p className="flex items-center gap-1.5">
                  <Download className="size-3.5 text-muted-foreground" />
                  <a
                    href={course.planPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    課程規劃表 PDF
                  </a>
                </p>
              )}
            </div>
          </div>

          {course.syllabus && (
            <p className="mt-3 text-sm">
              <span className="font-medium">課程大綱：</span>
              {course.syllabus}
            </p>
          )}

          {requirements.map((req, i) => (
            <p key={i} className="mt-1 flex items-start gap-1.5 text-sm">
              <ListChecks className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">合作要求{i + 1}：</span>
                {req}
              </span>
            </p>
          ))}
        </div>
      )}

      <ApplyMatchDialog
        courseId={course.id}
        courseTitle={course.title}
        hostSchoolName={course.hostSchoolName}
        requirements={requirements}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onApplied={() => router.refresh()}
      />
    </div>
  );
}
