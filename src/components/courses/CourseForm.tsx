"use client";

import { useState, useTransition } from "react";
import { CalendarClock, CalendarX2, FileText, ListChecks, Save, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/actions/courses";
import { toast } from "@/lib/toast";

const COURSE_TYPES = ["部定必修", "加深加廣選修", "校訂必修", "多元選修", "彈性課程"] as const;
const ACADEMIC_YEARS = ["114", "115", "116", "117"] as const;
const SEMESTERS = ["第一學期", "第二學期", "全學年"] as const;
const DAYS = ["週一", "週二", "週三", "週四", "週五", "週六"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export type CourseFormValues = {
  title: string;
  courseType: (typeof COURSE_TYPES)[number];
  academicYear: string;
  semester: (typeof SEMESTERS)[number];
  credits: number | null;
  dayOfWeek: (typeof DAYS)[number];
  startHour: number;
  endHour: number;
  syllabus: string | null;
  planPdfUrl: string | null;
  maxStudents: number;
  maxSchools: number;
  spsMin: number | null;
  spsMax: number | null;
  req1: string | null;
  req2: string | null;
  req3: string | null;
  partnerNotes: string[];
  closedToMatching: boolean;
  applicationDeadline: string | null;
};

export function CourseForm({
  initial,
  submitLabel,
  successMessage,
  onSubmit,
  onSuccess,
}: {
  initial?: Partial<CourseFormValues>;
  submitLabel: string;
  successMessage: string;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}) {
  const [courseType, setCourseType] = useState<(typeof COURSE_TYPES)[number]>(
    initial?.courseType ?? COURSE_TYPES[0]
  );
  const isFlexible = courseType === "彈性課程";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [maxSchools, setMaxSchools] = useState(initial?.maxSchools ?? 2);
  const [partnerNotes, setPartnerNotes] = useState<string[]>(() => {
    const notes = [...(initial?.partnerNotes ?? [])];
    notes.length = Math.max(0, initial?.maxSchools ?? 2);
    return Array.from(notes, (n) => n ?? "");
  });
  const [closedToMatching, setClosedToMatching] = useState(initial?.closedToMatching ?? false);
  const [applicationDeadline, setApplicationDeadline] = useState(initial?.applicationDeadline ?? "");

  function handleMaxSchoolsChange(value: number) {
    const next = Math.max(0, value);
    setMaxSchools(next);
    setPartnerNotes((prev) => {
      const resized = prev.slice(0, next);
      while (resized.length < next) resized.push("");
      return resized;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("courseType", courseType);
    if (isFlexible) formData.set("credits", "0");
    formData.delete("partnerNotes");
    partnerNotes.forEach((note) => formData.append("partnerNotes", note));
    formData.set("closedToMatching", String(closedToMatching));

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error, "儲存失敗");
        return;
      }
      toast.success(successMessage, "已儲存");
      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      <div>
        <Label className="mb-2 block">課程名稱</Label>
        <Input name="title" defaultValue={initial?.title} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">學年度</Label>
          <Select name="academicYear" defaultValue={initial?.academicYear ?? ACADEMIC_YEARS[0]}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACADEMIC_YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">學期</Label>
          <Select name="semester" defaultValue={initial?.semester ?? SEMESTERS[0]}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEMESTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">課程種類</Label>
        <Select value={courseType} onValueChange={(v) => v && setCourseType(v as typeof courseType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COURSE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">學分數</Label>
        <Input
          name="credits"
          type="number"
          min={0}
          max={4}
          defaultValue={isFlexible ? 0 : (initial?.credits ?? 0)}
          disabled={isFlexible}
        />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <CalendarClock className="size-4 text-muted-foreground" />
          開課時間
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="mb-2 block">星期</Label>
            <Select name="dayOfWeek" defaultValue={initial?.dayOfWeek ?? DAYS[0]}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">開始時間（時）</Label>
            <Select name="startHour" defaultValue={String(initial?.startHour ?? 8)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">結束時間（時）</Label>
            <Select name="endHour" defaultValue={String(initial?.endHour ?? 10)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">跨校學生人數上限</Label>
          <Input name="maxStudents" type="number" min={0} defaultValue={initial?.maxStudents ?? 20} />
        </div>
        <div>
          <Label className="mb-2 block">跨校學校數目上限</Label>
          <Input
            name="maxSchools"
            type="number"
            min={0}
            value={maxSchools}
            onChange={(e) => handleMaxSchoolsChange(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {maxSchools > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <School className="size-4 text-muted-foreground" />
            已找到的合作學校（選填）
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            如果您已經私下敲定部分合作學校，可以先填在這裡；沒有填的空格會在課程大廳公開徵求。
          </p>
          <div className="flex flex-col gap-2">
            {partnerNotes.map((note, i) => (
              <Input
                key={i}
                value={note}
                onChange={(e) =>
                  setPartnerNotes((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))
                }
                placeholder={`合作學校 ${i + 1}（例：市立三民高中）`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          checked={closedToMatching}
          onCheckedChange={(v) => setClosedToMatching(!!v)}
          className="mt-0.5"
        />
        <div>
          <Label className="block">新增課程但不想再增加合作學校</Label>
          <p className="text-sm text-muted-foreground">
            勾選後，即使還有未填滿的合作學校名額，此課程也不會在大廳公開徵求合作學校。
          </p>
        </div>
      </div>

      <div>
        <Label className="mb-2 flex items-center gap-1.5">
          <CalendarX2 className="size-4 text-muted-foreground" />
          合作邀請截止日期（選填）
        </Label>
        <Input
          name="applicationDeadline"
          type="date"
          value={applicationDeadline}
          onChange={(e) => setApplicationDeadline(e.target.value)}
          className="w-fit"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          超過此日期後，此課程即使名額未滿，也不會再於課程大廳被徵求合作學校。
        </p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Users className="size-4 text-muted-foreground" />
          每校學生人數
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">最少人數</Label>
            <Input name="spsMin" type="number" min={0} max={5} defaultValue={initial?.spsMin ?? 0} />
          </div>
          <div>
            <Label className="mb-2 block">最多人數</Label>
            <Input name="spsMax" type="number" min={0} max={5} defaultValue={initial?.spsMax ?? 0} />
          </div>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">課程規劃表 PDF（2MB 以內）</Label>
        <input
          name="planPdf"
          type="file"
          accept="application/pdf"
          className="block w-full text-sm file:mr-3 file:border file:border-input file:bg-secondary file:px-3 file:py-1.5"
        />
        {initial?.planPdfUrl && (
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <FileText className="size-3.5 text-muted-foreground" />
            目前 PDF：
            <a href={initial.planPdfUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              查看現有檔案
            </a>
            （不上傳則保留原檔）
          </p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">課程大綱／內容說明</Label>
        <Textarea name="syllabus" defaultValue={initial?.syllabus ?? ""} rows={4} />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <ListChecks className="size-4 text-muted-foreground" />
          合作要求
        </p>
        <div className="flex flex-col gap-2">
          <Input name="req1" defaultValue={initial?.req1 ?? ""} placeholder="例：合作學校需自備視訊設備" />
          <Input name="req2" defaultValue={initial?.req2 ?? ""} placeholder="要求二" />
          <Input name="req3" defaultValue={initial?.req3 ?? ""} placeholder="要求三" />
        </div>
      </div>

      {error && <p className="whitespace-pre-line text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? (
          "處理中…"
        ) : (
          <>
            <Save className="size-4" />
            {submitLabel}
          </>
        )}
      </Button>
    </form>
  );
}
