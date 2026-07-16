type OutgoingMatch = {
  id: number;
  status: "pending" | "approved" | "rejected";
  updatedAt: Date;
  courseTitle: string;
  hostSchoolName: string;
};

export function OutgoingMatchesTab({ matches }: { matches: OutgoingMatch[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">您尚未申請任何課程。</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => {
        const dateStr = new Date(m.updatedAt).toLocaleString("zh-TW");
        return (
          <div key={m.id} className="rounded-lg border border-border p-4 text-sm">
            {m.status === "approved" && (
              <p className="text-status-open">
                <strong>配對成功</strong>　<strong>{m.hostSchoolName}</strong> 已於 {dateStr} 答應您對「
                {m.courseTitle}」的申請，合作正式成立！
                <br />
                <span className="text-xs text-muted-foreground">
                  📌 接下來請雙方進行實際聯繫，確認課程細節與行政事宜，祝學生都能學習順利！
                </span>
              </p>
            )}
            {m.status === "rejected" && (
              <p className="text-status-partial">
                <strong>申請未獲通過</strong>　<strong>{m.hostSchoolName}</strong> 已於 {dateStr} 婉拒您對「
                {m.courseTitle}」的申請。
              </p>
            )}
            {m.status === "pending" && (
              <p>
                <strong>等待開課學校確認中</strong>　您向 <strong>{m.hostSchoolName}</strong> 申請了「
                {m.courseTitle}」，已於 {dateStr} 送出，請等候回覆。
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
