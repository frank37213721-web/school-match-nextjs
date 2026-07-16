"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAdminAccount } from "@/actions/admin";

const ROLES = ["系統管理員", "課程管理員", "審核管理員"] as const;

export function CreateAdminForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<(typeof ROLES)[number]>(ROLES[0]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await createAdminAccount({ name, phone, email, password, identity });
      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: `✅ 管理帳號創建成功！${name}（${identity}）` });
      setName("");
      setPhone("");
      setEmail("");
      setPassword("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <Label className="mb-2 block">管理員姓名</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label className="mb-2 block">聯絡電話</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <div>
        <Label className="mb-2 block">管理員 Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label className="mb-2 block">管理員密碼</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div>
        <Label className="mb-2 block">管理員角色</Label>
        <Select value={identity} onValueChange={(v) => v && setIdentity(v as typeof identity)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {message && (
        <p className={message.type === "success" ? "text-sm text-status-open" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "建立中…" : "創建管理帳號"}
      </Button>
    </form>
  );
}
