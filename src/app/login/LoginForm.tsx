"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ForgotPasswordSection } from "@/components/auth/ForgotPasswordSection";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { loginSchool } from "@/actions/schools";

export function LoginForm() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginSchool({ phone, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.role === "SiteAdmin" ? "/admin" : "/");
      router.refresh();
    });
  }

  return (
    <Tabs defaultValue="login" className="w-full max-w-2xl">
      <TabsList>
        <TabsTrigger value="login">學校帳號登入</TabsTrigger>
        <TabsTrigger value="register">註冊學校帳號</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="flex flex-col gap-8 pt-4">
        <form onSubmit={handleLogin} className="flex max-w-sm flex-col gap-4">
          <div>
            <Label className="mb-2 block">帳號（學校電話）</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <Label className="mb-2 block">密碼</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "登入中…" : "確認登入"}
          </Button>
        </form>

        <Separator />

        <ForgotPasswordSection />
      </TabsContent>

      <TabsContent value="register" className="pt-4">
        <RegisterForm />
      </TabsContent>
    </Tabs>
  );
}
