import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { getAllMatchesDetailed } from "@/db/queries/matches";

type MatchRow = Awaited<ReturnType<typeof getAllMatchesDetailed>>[number];

const STATUS_LABEL: Record<string, string> = {
  pending: "待審核",
  approved: "已配對",
  rejected: "已婉拒",
};

const EMAIL_STATUS_LABEL: Record<string, string> = {
  pending: "尚未發送",
  sent: "已發送",
  failed: "發送失敗",
};

export function MatchRecordsTab({ matches }: { matches: MatchRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {matches.length} 筆配對紀錄</p>
        <a href="/api/admin/matches/export">
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
              <th className="px-3 py-2 font-medium">課程名稱</th>
              <th className="px-3 py-2 font-medium">開課學校</th>
              <th className="px-3 py-2 font-medium">申請學校</th>
              <th className="px-3 py-2 font-medium">狀態</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">申請時間</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2">{m.courseTitle}</td>
                <td className="px-3 py-2">{m.hostSchoolName}</td>
                <td className="px-3 py-2">{m.applicantSchoolName}</td>
                <td className="px-3 py-2">{STATUS_LABEL[m.status] ?? m.status}</td>
                <td className="px-3 py-2">{EMAIL_STATUS_LABEL[m.emailStatus] ?? m.emailStatus}</td>
                <td className="px-3 py-2">{m.createdAt.toLocaleString("zh-TW")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
