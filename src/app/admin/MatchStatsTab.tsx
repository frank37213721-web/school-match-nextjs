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
        <p className="mb-3 text-sm font-medium">📤 開課學校配對狀況</p>
        <div className="flex flex-col gap-2">
          {courses.map((c) => {
            const isFull = c.approvedCount >= c.maxSchools;
            const badge = isFull
              ? `🔴 ${c.approvedCount}/${c.maxSchools} 已配對額滿`
              : c.approvedCount > 0
                ? `🟡 ${c.approvedCount}/${c.maxSchools} 仍有配對名額`
                : `⚪ 0/${c.maxSchools} 尚無配對學校`;
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                <span>
                  {c.hostSchoolName} — {c.title}
                </span>
                <span>
                  {badge}　⏳待審核 {c.pendingCount} 所
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium">📥 申請學校配對狀況</p>
        <div className="flex flex-col gap-2">
          {applicantStats.map((s) => (
            <p key={s.schoolName} className="text-sm">
              <strong>{s.schoolName}</strong>　共送出 {s.total} 次申請，已成功配對 {s.approved} 次
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
