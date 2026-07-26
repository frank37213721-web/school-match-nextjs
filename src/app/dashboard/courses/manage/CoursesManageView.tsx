"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, ChevronDown, ChevronRight, Check, Plus, SquarePen, Trash2, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CourseForm } from "@/components/courses/CourseForm";
import { createCourse, deleteCourse, updateCourse } from "@/actions/courses";
import type { courses as coursesTable } from "@/db/schema";
import { toast } from "@/lib/toast";

type CourseRow = typeof coursesTable.$inferSelect;

export function CoursesManageView({ courses }: { courses: CourseRow[] }) {
  const router = useRouter();

  return (
    <Tabs defaultValue="add" className="w-full">
      <TabsList>
        <TabsTrigger value="add" className="gap-1.5">
          <Plus className="size-3.5" />
          新增課程
        </TabsTrigger>
        <TabsTrigger value="edit" className="gap-1.5">
          <SquarePen className="size-3.5" />
          修改／刪除課程
        </TabsTrigger>
      </TabsList>

      <TabsContent value="add" className="pt-4">
        <div className="card-shadow max-w-2xl rounded-lg border border-border bg-card p-8">
          <CourseForm
            submitLabel="確認新增課程"
            successMessage="課程已成功建立。"
            onSubmit={createCourse}
            onSuccess={() => router.refresh()}
          />
        </div>
      </TabsContent>

      <TabsContent value="edit" className="flex flex-col gap-3 pt-4">
        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <BookMarked className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">您目前尚無開設任何課程。</p>
          </div>
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
        toast.error(result.error, "刪除失敗");
        return;
      }
      toast.success(`「${course.title}」已刪除。`, "已刪除");
      onChanged();
    });
  }

  return (
    <details
      className="card-shadow max-w-2xl overflow-hidden rounded-lg border border-border bg-card open:pb-6"
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium text-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        {course.title}
      </summary>

      <div className="flex flex-col gap-4 px-5">
        <CourseForm
          submitLabel="儲存修改"
          successMessage="課程資料已更新。"
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
            partnerNotes: course.partnerNotes,
            closedToMatching: course.closedToMatching,
            applicationDeadline: course.applicationDeadline,
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
            <p className="text-sm text-status-partial">確定要刪除此課程？此操作無法復原。</p>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
              <Check className="size-4" />
              {pending ? "刪除中…" : "確認刪除"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmingDelete(false)}>
              <X className="size-4" />
              取消
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
            <Trash2 className="size-4" />
            刪除此課程
          </Button>
        )}
      </div>
    </details>
  );
}
