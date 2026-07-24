"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TermsGate } from "./TermsGate";
import { lookupSchoolByCode, registerSchool } from "@/actions/schools";
import { toast } from "@/lib/toast";

const DISTRICTS = ["", "北一區", "北二區", "北三區", "中區", "南區", "其他"] as const;

function isValidPassword(pw: string) {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export function RegisterForm() {
  const router = useRouter();
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "found" | "not-found">("idle");
  const [district, setDistrict] = useState<string>("");
  const [registryDistrict, setRegistryDistrict] = useState<string | null>(null);

  const [registrantName, setRegistrantName] = useState("");
  const [registrantExtension, setRegistrantExtension] = useState("");
  const [phone, setPhone] = useState("");
  const [registrantEmail, setRegistrantEmail] = useState("");
  const [academicDirectorEmail, setAcademicDirectorEmail] = useState("");
  const [principalEmail, setPrincipalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCodeBlur() {
    const code = schoolCode.trim().toUpperCase();
    if (!code) {
      setSchoolName("");
      setLookupState("idle");
      return;
    }
    startTransition(async () => {
      const result = await lookupSchoolByCode(code);
      if (result) {
        setSchoolName(result.name);
        setRegistryDistrict(result.district);
        setLookupState("found");
      } else {
        setSchoolName("");
        setRegistryDistrict(null);
        setLookupState("not-found");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidPassword(password)) {
      setError("密碼須至少 8 碼，且同時包含英文字母與數字。");
      return;
    }
    if (password !== passwordConfirm) {
      setError("兩次輸入的密碼不一致，請重新確認。");
      return;
    }

    startTransition(async () => {
      const result = await registerSchool({
        schoolCode,
        district,
        registrantName,
        registrantExtension,
        phone,
        registrantEmail,
        academicDirectorEmail,
        principalEmail,
        password,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error, "註冊失敗");
        return;
      }
      toast.success("您的學校帳號已成功建立，現在可以登入了。", "註冊成功");
      router.push("/login");
      router.refresh();
    });
  }

  if (!termsAgreed) {
    return <TermsGate agreed={termsAgreed} onAgreedChange={setTermsAgreed} />;
  }

  const passwordHint = password && !isValidPassword(password);
  const passwordOk = password && isValidPassword(password);
  const confirmMismatch = passwordConfirm && password !== passwordConfirm;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <div>
        <p className="mb-3 text-sm font-medium">1. 學校基本資訊</p>
        <div className="flex flex-col gap-3">
          <div>
            <Label className="mb-2 block">學校代碼</Label>
            <Input
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              onBlur={handleCodeBlur}
              placeholder="例：183314"
              maxLength={10}
            />
            {lookupState === "found" && (
              <p className="mt-1 text-sm text-status-open">
                ✅ 找到學校：{schoolName} {registryDistrict ? `(${registryDistrict})` : ""}
              </p>
            )}
            {lookupState === "not-found" && (
              <p className="mt-1 text-sm text-destructive">❌ 找不到此代碼，請確認後重新輸入。</p>
            )}
          </div>
          <div>
            <Label className="mb-2 block">學校名稱（自動帶入）</Label>
            <Input value={schoolName} disabled placeholder="輸入學校代碼後自動帶入" />
          </div>
          <div>
            <Label className="mb-2 block">學校分區（選填，如為前導高優學校請選擇分區）</Label>
            <Select value={district} onValueChange={(v) => setDistrict(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="（不選擇）" />
              </SelectTrigger>
              <SelectContent>
                {DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d || "（不選擇）"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-sm font-medium">2. 承辦人資訊</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-2 block">承辦人姓名</Label>
            <Input
              value={registrantName}
              onChange={(e) => setRegistrantName(e.target.value)}
              placeholder="例：王小明"
            />
          </div>
          <div>
            <Label className="mb-2 block">承辦人分機</Label>
            <Input
              value={registrantExtension}
              onChange={(e) => setRegistrantExtension(e.target.value)}
              placeholder="例：123"
              maxLength={10}
            />
          </div>
        </div>
        <div className="mt-3">
          <Label className="mb-2 block">學校電話（作為登入帳號，請含區域號碼）</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="例：073475181"
            maxLength={10}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            ⚠️ 請輸入含區域號碼的完整電話，例如高雄市為 07、台北市為 02
          </p>
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-sm font-medium">3. 學校重要聯絡人 Email</p>
        <div className="flex flex-col gap-3">
          <div>
            <Label className="mb-2 block">承辦人 Email</Label>
            <Input
              type="email"
              value={registrantEmail}
              onChange={(e) => setRegistrantEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block">承辦處室主任 Email</Label>
            <Input
              type="email"
              value={academicDirectorEmail}
              onChange={(e) => setAcademicDirectorEmail(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block">校長 Email</Label>
            <Input
              type="email"
              value={principalEmail}
              onChange={(e) => setPrincipalEmail(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-sm font-medium">4. 設定登入密碼</p>
        <p className="mb-3 text-xs text-muted-foreground">密碼至少 8 碼，且須同時包含英文字母與數字。</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-2 block">設定密碼</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 block">確認密碼</Label>
            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
        </div>
        {passwordHint && (
          <p className="mt-2 text-sm text-status-partial">⚠️ 密碼須至少 8 碼，且同時包含英文字母與數字。</p>
        )}
        {passwordOk && confirmMismatch && <p className="mt-2 text-sm text-destructive">❌ 兩次輸入的密碼不一致。</p>}
        {passwordOk && passwordConfirm && !confirmMismatch && (
          <p className="mt-2 text-sm text-status-open">✅ 密碼符合規定。</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "處理中…" : "確認註冊"}
      </Button>
    </form>
  );
}
