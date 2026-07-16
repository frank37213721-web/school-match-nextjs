import { SendHorizontal, Inbox } from "lucide-react";
import type { LobbyCourse } from "@/db/queries/courses";

export function MatchStatsTab({
  courses,
  applicantStats,
}: {
  courses: LobbyCourse[];
  applicantStats: { schoolName: string; total: number; approved: number }[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
          <SendHorizontal className="size-4 text-muted-foreground" />
          開課學校配對狀況
        </p>
        <div className="flex flex-col gap-2">
          {courses.map((c) => {
            const isFull = c.approvedCount >= c.maxSchools;
            const label = isFull
              ? `${c.approvedCount}/${c.maxSchools} 已配對額滿`
              : c.approvedCount > 0
                ? `${c.approvedCount}/${c.maxSchools} 仍有配對名額`
                : `0/${c.maxSchools} 尚無配對學校`;
            const dotClass = isFull
              ? "bg-status-full"
              : c.approvedCount > 0
                ? "bg-status-partial"
                : "bg-muted-foreground";
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-muted/40"
              >
                <span>
                  {c.hostSchoolName} — {c.title}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`size-1.5 rounded-full ${dotClass}`} />
                  {label}　待審核 {c.pendingCount} 所
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
          <Inbox className="size-4 text-muted-foreground" />
          申請學校配對狀況
        </p>
        <div className="flex flex-col gap-2">
          {applicantStats.map((s) => (
            <p
              key={s.schoolName}
              className="rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/40"
            >
              <strong>{s.schoolName}</strong>　共送出 {s.total} 次申請，已成功配對 {s.approved} 次
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
