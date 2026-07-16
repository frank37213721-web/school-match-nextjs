"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplyMatchDialog } from "./ApplyMatchDialog";
import type { LobbyCourse } from "@/db/queries/courses";

function formatTime(dayOfWeek: string, startHour: number, endHour: number) {
  const pad = (h: number) => String(h).padStart(2, "0");
  return `${dayOfWeek} ${pad(startHour)}:00 ~ ${pad(endHour)}:00`;
}

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

  const activeCount = course.approvedCount + course.pendingCount;
  const isFull = activeCount >= course.maxSchools;
  const isHost = currentSchoolId === course.hostSchoolId;

  let statusLabel: string;
  let statusClass: string;
  if (isFull) {
    statusLabel = "🔴 名額已滿";
    statusClass = "bg-status-full/10 text-status-full border-status-full";
  } else if (course.approvedCount > 0) {
    statusLabel = `🟡 ${course.approvedCount}/${course.maxSchools} 所`;
    statusClass = "bg-status-partial/10 text-status-partial border-status-partial";
  } else {
    statusLabel = `🟢 開放中 ${course.approvedCount}/${course.maxSchools}`;
    statusClass = "bg-status-open/10 text-status-open border-status-open";
  }

  const requirements = [course.req1, course.req2, course.req3].filter(
    (r): r is string => !!r
  );

  return (
    <div className="card-shadow rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={`badge-course-${course.courseType} mb-2 inline-block rounded-md border px-2 py-0.5 text-xs`}
          >
            {course.courseType}
          </span>
          <h3 className="truncate text-lg font-semibold text-foreground">{course.title}</h3>
          <p className="mt-1 text-sm">
            <span className="font-semibold text-[#1a3060]">🏫 {course.hostSchoolName}</span>
            {course.hostSchoolDistrict && (
              <span className="ml-2 text-xs text-muted-foreground">· {course.hostSchoolDistrict}</span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            📅 {course.academicYear} 學年度 · {course.semester}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            🗓️ {formatTime(course.dayOfWeek, course.startHour, course.endHour)} ✅ {course.approvedCount}{" "}
            所已配對 ⏳ {course.pendingCount} 所待審
          </p>
        </div>
        <Badge variant="outline" className={statusClass}>
          {statusLabel}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "收起 ▴" : "詳情 ▾"}
        </Button>

        {isHost ? (
          <p className="text-sm text-muted-foreground">📌 此為您開設的課程，無法申請配對。</p>
        ) : isLoggedIn ? (
          <Button size="sm" disabled={isFull} onClick={() => setApplyOpen(true)}>
            {isFull ? "🚫 名額已滿" : "申請配對 →"}
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
              <p>📅 學年度／學期：{course.academicYear} 學年度 {course.semester}</p>
              <p>📚 課程種類：{course.courseType}</p>
              <p>🎯 學分數：{course.credits ?? 0} 學分</p>
              <p>🗓️ 開課時間：{formatTime(course.dayOfWeek, course.startHour, course.endHour)}</p>
              <p>👥 跨校學生上限：{course.maxStudents} 人</p>
              {(course.spsMin || course.spsMax) && (
                <p>
                  🎓 每校學生人數：{course.spsMin ?? 0} ~ {course.spsMax ?? 0} 人
                </p>
              )}
            </div>
            <div>
              <p>🏫 合作學校上限：{course.maxSchools} 所</p>
              <p>
                📊 目前：✅ 已配對 {course.approvedCount} 所　⏳ 待審 {course.pendingCount} 所
              </p>
              {course.planPdfUrl && (
                <p>
                  📥{" "}
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
              <span className="font-medium">📝 課程大綱：</span>
              {course.syllabus}
            </p>
          )}

          {requirements.map((req, i) => (
            <p key={i} className="mt-1 text-sm">
              <span className="font-medium">📌 合作要求{i + 1}：</span>
              {req}
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
