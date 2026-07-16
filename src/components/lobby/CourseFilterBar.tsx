"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const COURSE_TYPES = ["部定必修", "加深加廣選修", "校訂必修", "多元選修", "彈性課程"] as const;
export const DAYS = ["週一", "週二", "週三", "週四", "週五", "週六"] as const;

export function CourseFilterBar({
  search,
  onSearchChange,
  selectedTypes,
  onToggleType,
  day,
  onDayChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  selectedTypes: Set<string>;
  onToggleType: (type: string) => void;
  day: string;
  onDayChange: (v: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
            🔍 搜尋課程
          </label>
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="課程名稱或關鍵字"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
            開課時間
          </label>
          <Select value={day} onValueChange={(v) => onDayChange(v ?? "全部時間")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="全部時間">全部時間</SelectItem>
              {DAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
            課程種類
          </label>
          <div className="flex flex-wrap gap-2">
            {COURSE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onToggleType(type)}
                className={`badge-course-${type} rounded-md border px-2.5 py-1 text-xs transition-opacity ${
                  selectedTypes.size === 0 || selectedTypes.has(type) ? "opacity-100" : "opacity-30"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
