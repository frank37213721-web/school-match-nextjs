"use client";

import { useState, useTransition } from "react";
import { KeyRound, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestSchoolPasswordReset } from "@/actions/schools";

export function ForgotPasswordSection() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!phone) {
      setMessage("⚠️ 請輸入學校帳號（電話號碼）。");
      return;
    }
    startTransition(async () => {
      await requestSchoolPasswordReset(phone);
      setMessage("📧 若此帳號存在，系統已寄出一封重設密碼的連結信至承辦人 Email。請至信箱收取後點擊連結設定新密碼。");
      setPhone("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <KeyRound className="size-4 text-muted-foreground" />
        忘記密碼
      </p>
      <p className="text-sm text-muted-foreground">如果您忘記密碼，可以輸入學校帳號寄送重設密碼連結。</p>

      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <div>
          <Label className="mb-2 block">學校帳號（電話號碼）</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} />
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button type="submit" variant="secondary" disabled={pending}>
          <SendHorizontal className="size-4" />
          {pending ? "處理中…" : "寄送重設連結"}
        </Button>
      </form>
    </div>
  );
}
