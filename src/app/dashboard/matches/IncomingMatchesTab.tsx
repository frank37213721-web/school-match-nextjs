"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveMatch, rejectMatch } from "@/actions/matches";

type IncomingMatch = {
  id: number;
  status: "pending" | "approved" | "rejected";
  updatedAt: Date;
  courseTitle: string;
  partnerSchoolName: string;
};

export function IncomingMatchesTab({ matches }: { matches: IncomingMatch[] }) {
  const router = useRouter();

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <Inbox className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">目前尚無收到申請。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => (
        <MatchRow key={m.id} match={m} onChanged={() => router.refresh()} />
      ))}
    </div>
  );
}

function MatchRow({ match, onChanged }: { match: IncomingMatch; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approveMatch(match.id);
      onChanged();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectMatch(match.id);
      onChanged();
    });
  }

  const dateStr = new Date(match.updatedAt).toLocaleString("zh-TW");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm">
        <span className="font-medium">{match.partnerSchoolName}</span> 申請了「{match.courseTitle}」
        {match.status === "pending" && (
          <span className="ml-2 inline-flex items-center gap-1.5 text-status-partial">
            <span className="size-1.5 rounded-full bg-status-partial" />
            待審核
          </span>
        )}
        {match.status === "approved" && (
          <span className="ml-2 inline-flex items-center gap-1.5 text-status-open">
            <span className="size-1.5 rounded-full bg-status-open" />
            您已於 {dateStr} 答應對方的申請
          </span>
        )}
        {match.status === "rejected" && (
          <span className="ml-2 text-muted-foreground">您已於 {dateStr} 婉拒該校的申請</span>
        )}
      </p>
      {match.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={handleApprove} disabled={pending}>
            <Check className="size-4" />
            確認正式合作
          </Button>
          <Button size="sm" variant="secondary" onClick={handleReject} disabled={pending}>
            <X className="size-4" />
            婉拒
          </Button>
        </div>
      )}
    </div>
  );
}
