import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LobbyCourse } from "@/db/queries/courses";
import { formatTimeSlots } from "@/lib/timeSlots";

export function CourseRecordsTab({ courses }: { courses: LobbyCourse[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {courses.length} 門課程</p>
        <a href="/api/admin/courses/export">
          <Button size="sm" variant="secondary">
            <Download className="size-4" />
            匯出 Excel
          </Button>
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">開課學校</th>
              <th className="px-3 py-2 font-medium">課程名稱</th>
              <th className="px-3 py-2 font-medium">種類</th>
              <th className="px-3 py-2 font-medium">學年度／學期</th>
              <th className="px-3 py-2 font-medium">時間</th>
              <th className="px-3 py-2 font-medium">配對狀況</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2">{c.hostSchoolName}</td>
                <td className="px-3 py-2">{c.title}</td>
                <td className="px-3 py-2">{c.courseType}</td>
                <td className="px-3 py-2">
                  {c.academicYear}・{c.semester}
                </td>
                <td className="px-3 py-2">{formatTimeSlots(c.timeSlots)}</td>
                <td className="px-3 py-2">
                  {c.approvedCount}/{c.maxSchools} 已配對　待審核 {c.pendingCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
