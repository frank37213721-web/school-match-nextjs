"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CourseForm } from "@/components/courses/CourseForm";
import { createCourse, deleteCourse, updateCourse } from "@/actions/courses";
import type { courses as coursesTable } from "@/db/schema";

type CourseRow = typeof coursesTable.$inferSelect;

export function CoursesManageView({ courses }: { courses: CourseRow[] }) {
  const router = useRouter();

  return (
    <Tabs defaultValue="add" className="w-full">
      <TabsList>
        <TabsTrigger value="add">➕ 新增課程</TabsTrigger>
        <TabsTrigger value="edit">✏️ 修改／刪除課程</TabsTrigger>
      </TabsList>

      <TabsContent value="add" className="pt-4">
        <CourseForm submitLabel="確認新增課程" onSubmit={createCourse} onSuccess={() => router.refresh()} />
      </TabsContent>

      <TabsContent value="edit" className="flex flex-col gap-3 pt-4">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">您目前尚無開設任何課程。</p>
        ) : (
          courses.map((c) => <CourseEditRow key={c.id} course={c} onChanged={() => router.refresh()} />)
        )}
      </TabsContent>
    </Tabs>
  );
}

function CourseEditRow({ course, onChanged }: { course: CourseRow; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [blockingSchools, setBlockingSchools] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourse(course.id);
      if (!result.ok) {
        setDeleteError(result.error);
        setBlockingSchools(result.blockingSchools ?? null);
        setConfirmingDelete(false);
        return;
      }
      onChanged();
    });
  }

  return (
    <details className="border border-border p-3" open={expanded} onToggle={(e) => setExpanded(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm">📖 {course.title}</summary>

      <div className="mt-4 flex flex-col gap-4">
        <CourseForm
          submitLabel="💾 儲存修改"
          initial={{
            title: course.title,
            courseType: course.courseType,
            academicYear: course.academicYear,
            semester: course.semester,
            credits: course.credits,
            dayOfWeek: course.dayOfWeek,
            startHour: course.startHour,
            endHour: course.endHour,
            syllabus: course.syllabus,
            planPdfUrl: course.planPdfUrl,
            maxStudents: course.maxStudents,
            maxSchools: course.maxSchools,
            spsMin: course.spsMin,
            spsMax: course.spsMax,
            req1: course.req1,
            req2: course.req2,
            req3: course.req3,
          }}
          onSubmit={(formData) => updateCourse(course.id, formData)}
          onSuccess={onChanged}
        />

        {deleteError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="whitespace-pre-line">{deleteError}</p>
            {blockingSchools && (
              <ul className="mt-2 list-disc pl-5">
                {blockingSchools.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-status-partial">⚠️ 確定要刪除此課程？此操作無法復原。</p>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "刪除中…" : "✅ 確認刪除"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmingDelete(false)}>
              ❌ 取消
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="w-fit"
            onClick={() => {
              setDeleteError(null);
              setConfirmingDelete(true);
            }}
          >
            🗑️ 刪除此課程
          </Button>
        )}
      </div>
    </details>
  );
}
