"use client";

import { useState, useTransition } from "react";
import { Mail, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { applyForMatch } from "@/actions/matches";
import { toast } from "@/lib/toast";

const FIXED_CHECKLIST = [
  "確認授課時間段是否可以配合",
  "確認課程計劃未來是否可以新增課程",
  "確認合作學校端所準備之設備與環境是否可以安排妥當",
  "未來如配對成功，基於誠信原則請與開課學校建立良好夥伴關係",
];

export function ApplyMatchDialog({
  courseId,
  courseTitle,
  hostSchoolName,
  requirements,
  open,
  onOpenChange,
  onApplied,
}: {
  courseId: number;
  courseTitle: string;
  hostSchoolName: string;
  requirements: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}) {
  const items = [...FIXED_CHECKLIST, ...requirements];
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const [step, setStep] = useState<"checklist" | "confirm">("checklist");
  const [message, setMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  const allChecked = checked.every(Boolean);

  function reset() {
    setChecked(items.map(() => false));
    setStep("checklist");
    setMessage(null);
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await applyForMatch(courseId);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        toast.error(result.error, "申請失敗");
        return;
      }
      const text =
        result.warning ??
        `貴校對於「${hostSchoolName}」的「${courseTitle}」已送出配對申請。對方學校承辦人、承辦處室主任、校長均已收到 Email 通知，請耐心等候回覆。`;
      setMessage({ type: result.warning ? "warning" : "success", text });
      if (result.warning) {
        toast.warning(text, "申請已送出");
      } else {
        toast.success(text, "申請已送出");
      }
      onApplied();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>申請配對：{courseTitle}</DialogTitle>
        </DialogHeader>

        {message ? (
          <div className="flex flex-col gap-4">
            <p
              className={
                message.type === "error"
                  ? "text-sm text-destructive"
                  : message.type === "warning"
                    ? "text-sm text-status-partial"
                    : "text-sm text-status-open"
              }
            >
              {message.text}
            </p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>關閉</Button>
            </DialogFooter>
          </div>
        ) : step === "checklist" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {items.map((item, i) => (
                <label key={i} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={checked[i]}
                    onCheckedChange={(v) =>
                      setChecked((prev) => prev.map((c, idx) => (idx === i ? !!v : c)))
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button disabled={!allChecked} onClick={() => setStep("confirm")}>
                確定送出申請
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-1.5 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              即將發送課程合作邀請給開課學校承辦人、處室主任、校長。
            </p>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setStep("checklist")} disabled={pending}>
                <X className="size-4" />
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={pending}>
                <Send className="size-4" />
                {pending ? "送出中…" : "確認送出"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
