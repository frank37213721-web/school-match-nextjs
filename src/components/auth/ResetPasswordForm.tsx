"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetSchoolPassword } from "@/actions/schools";
import { toast } from "@/lib/toast";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("重設連結無效，請重新申請密碼重設。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("兩次輸入的密碼不一致。");
      return;
    }

    startTransition(async () => {
      const result = await resetSchoolPassword({ token, newPassword });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error, "重設密碼失敗");
        return;
      }
      toast.success("密碼已重設成功，請用新密碼登入。", "重設成功");
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div>
        <Label className="mb-2 block">新密碼</Label>
        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
      </div>
      <div>
        <Label className="mb-2 block">確認新密碼</Label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">密碼至少 8 碼，且須同時包含英文字母與數字。</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "設定中…" : "設定新密碼"}
      </Button>
    </form>
  );
}
