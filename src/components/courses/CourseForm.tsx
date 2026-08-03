"use client";

import { useRef, useState, useTransition } from "react";
import {
  CalendarClock,
  CalendarX2,
  FileText,
  ListChecks,
  Plus,
  Save,
  School,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/actions/courses";
import { searchSchoolNames } from "@/actions/schools";
import { toast } from "@/lib/toast";

const COURSE_TYPES = ["部定必修", "加深加廣選修", "校訂必修", "多元選修", "彈性課程"] as const;
const ACADEMIC_YEARS = ["114", "115", "116", "117"] as const;
const SEMESTERS = ["第一學期", "第二學期", "全學年"] as const;
const DAYS = ["週一", "週二", "週三", "週四", "週五", "週六"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export type CourseTimeSlotValue = {
  dayOfWeek: (typeof DAYS)[number];
  startHour: number;
  endHour: number;
};

export type CourseFormValues = {
  title: string;
  courseType: (typeof COURSE_TYPES)[number];
  academicYear: string;
  semester: (typeof SEMESTERS)[number];
  credits: number | null;
  timeSlots: CourseTimeSlotValue[];
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
  const [partnerNotesError, setPartnerNotesError] = useState<string | null>(null);

  const [timeSlots, setTimeSlots] = useState<CourseTimeSlotValue[]>(
    initial?.timeSlots && initial.timeSlots.length > 0
      ? initial.timeSlots
      : [{ dayOfWeek: DAYS[0], startHour: 8, endHour: 10 }]
  );
  const [timeSlotsError, setTimeSlotsError] = useState<string | null>(null);

  function addTimeSlot() {
    setTimeSlots((prev) => [...prev, { dayOfWeek: DAYS[0], startHour: 8, endHour: 10 }]);
  }

  function removeTimeSlot(index: number) {
    setTimeSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTimeSlot(index: number, patch: Partial<CourseTimeSlotValue>) {
    setTimeSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

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
    setPartnerNotesError(null);
    setTimeSlotsError(null);

    if (timeSlots.length === 0) {
      setTimeSlotsError("請至少新增一個上課時段。");
      return;
    }
    const invalidSlot = timeSlots.find((slot) => slot.endHour <= slot.startHour);
    if (invalidSlot) {
      setTimeSlotsError("每個時段的結束時間都必須晚於開始時間。");
      return;
    }

    if (closedToMatching && partnerNotes.every((n) => !n.trim())) {
      setPartnerNotesError("勾選「不想再增加合作學校」時，請至少填寫一間已找到的合作學校。");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("courseType", courseType);
    if (isFlexible) formData.set("credits", "0");
    formData.set("timeSlots", JSON.stringify(timeSlots));
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
        <div className="flex flex-col gap-3">
          {timeSlots.map((slot, index) => (
            <div key={index} className="flex items-end gap-3">
              <div className="grid flex-1 grid-cols-3 gap-3">
                <div>
                  {index === 0 && <Label className="mb-2 block">星期</Label>}
                  <Select
                    value={slot.dayOfWeek}
                    onValueChange={(v) => v && updateTimeSlot(index, { dayOfWeek: v as (typeof DAYS)[number] })}
                  >
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
                  {index === 0 && <Label className="mb-2 block">開始時間（時）</Label>}
                  <Select
                    value={String(slot.startHour)}
                    onValueChange={(v) => v && updateTimeSlot(index, { startHour: Number(v) })}
                  >
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
                  {index === 0 && <Label className="mb-2 block">結束時間（時）</Label>}
                  <Select
                    value={String(slot.endHour)}
                    onValueChange={(v) => v && updateTimeSlot(index, { endHour: Number(v) })}
                  >
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
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={timeSlots.length <= 1}
                onClick={() => removeTimeSlot(index)}
                aria-label="移除此時段"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addTimeSlot}>
          <Plus className="size-4" />
          新增時段
        </Button>
        {timeSlotsError && <p className="mt-2 text-sm text-destructive">{timeSlotsError}</p>}
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
            已找到的合作學校
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            如果您已經私下敲定部分合作學校，可以先填在這裡；沒有填的空格會在課程大廳公開徵求。
          </p>
          <div className="flex flex-col gap-2">
            {partnerNotes.map((note, i) => (
              <PartnerSchoolInput
                key={i}
                index={i}
                value={note}
                onChange={(next) => {
                  setPartnerNotesError(null);
                  setPartnerNotes((prev) => prev.map((n, idx) => (idx === i ? next : n)));
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          checked={closedToMatching}
          onCheckedChange={(v) => {
            setClosedToMatching(!!v);
            setPartnerNotesError(null);
          }}
          className="mt-0.5"
        />
        <div>
          <Label className="block">新增課程但不想再增加合作學校</Label>
          <p className="text-sm text-muted-foreground">
            勾選後，即使還有未填滿的合作學校名額，此課程也不會在大廳公開徵求合作學校。
          </p>
        </div>
      </div>

      {partnerNotesError && <p className="text-sm text-destructive">{partnerNotesError}</p>}

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
            <Input name="spsMin" type="number" min={0} max={30} defaultValue={initial?.spsMin ?? 0} />
          </div>
          <div>
            <Label className="mb-2 block">最多人數</Label>
            <Input name="spsMax" type="number" min={0} max={30} defaultValue={initial?.spsMax ?? 0} />
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

function PartnerSchoolInput({
  index,
  value,
  onChange,
}: {
  index: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<{ name: string; district: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function handleInputChange(next: string) {
    onChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = next.trim();
    if (!trimmed) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const results = await searchSchoolNames(trimmed);
      if (requestIdRef.current !== requestId) return; // a newer keystroke already fired
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 250);
  }

  function handleSelect(name: string, district: string | null) {
    onChange(district ? `${name}（${district}）` : name);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`合作學校 ${index + 1}（例：市立三民高中）`}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-elevation-3">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s.name, s.district)}
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              {s.name}
              {s.district && <span className="text-muted-foreground">（{s.district}）</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
