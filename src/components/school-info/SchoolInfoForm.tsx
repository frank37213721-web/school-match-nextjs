"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { changeSchoolPassword, updateSchoolProfile } from "@/actions/schools";
import type { CurrentSchool } from "@/lib/auth";

const DISTRICTS = ["", "北一區", "北二區", "北三區", "中區", "南區", "其他"] as const;

export function SchoolInfoForm({ school }: { school: CurrentSchool }) {
  const router = useRouter();

  const [name, setName] = useState(school.name);
  const [district, setDistrict] = useState(school.district ?? "");
  const [registrantName, setRegistrantName] = useState(school.registrantName);
  const [registrantExtension, setRegistrantExtension] = useState("");
  const [academicDirectorEmail, setAcademicDirectorEmail] = useState(
    school.academicDirectorEmail ?? ""
  );
  const [principalEmail, setPrincipalEmail] = useState(school.principalEmail ?? "");
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [profilePending, startProfileTransition] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwdPending, startPwdTransition] = useTransition();

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage(null);
    startProfileTransition(async () => {
      const result = await updateSchoolProfile({
        name,
        district,
        registrantName,
        registrantExtension,
        academicDirectorEmail,
        principalEmail,
      });
      if (!result.ok) {
        setProfileMessage({ type: "error", text: result.error });
        return;
      }
      setProfileMessage({ type: "success", text: "✅ 資料更新成功！" });
      router.refresh();
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwdMessage(null);
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: "error", text: "❌ 兩次輸入的新密碼不一致。" });
      return;
    }
    startPwdTransition(async () => {
      const result = await changeSchoolPassword({ currentPassword, newPassword });
      if (!result.ok) {
        setPwdMessage({ type: "error", text: result.error });
        return;
      }
      setPwdMessage({ type: "success", text: "✅ 密碼已成功更新！" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
        <div>
          <Label className="mb-2 block">帳號（學校電話）</Label>
          <Input value={school.phone} disabled />
        </div>
        <div>
          <Label className="mb-2 block">學校名稱</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label className="mb-2 block">學校分區（選填）</Label>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">承辦人姓名</Label>
            <Input value={registrantName} onChange={(e) => setRegistrantName(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 block">承辦人分機</Label>
            <Input
              value={registrantExtension}
              onChange={(e) => setRegistrantExtension(e.target.value)}
              maxLength={10}
            />
          </div>
        </div>
        <div>
          <Label className="mb-2 block">承辦人 Email（登入帳號，無法修改）</Label>
          <Input value={school.registrantEmail} disabled />
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
          <Input type="email" value={principalEmail} onChange={(e) => setPrincipalEmail(e.target.value)} />
        </div>
        {profileMessage && (
          <p className={profileMessage.type === "success" ? "text-sm text-status-open" : "text-sm text-destructive"}>
            {profileMessage.text}
          </p>
        )}
        <Button type="submit" disabled={profilePending}>
          <Save className="size-4" />
          {profilePending ? "儲存中…" : "儲存所有變更"}
        </Button>
      </form>

      <Separator />

      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
        <p className="text-sm font-medium">密碼變更（不修改請留空）</p>
        <p className="text-xs text-muted-foreground">新密碼須至少 8 碼，且同時包含英文字母與數字</p>
        <div>
          <Label className="mb-2 block">目前密碼</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">新密碼</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 block">確認新密碼</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        {pwdMessage && (
          <p className={pwdMessage.type === "success" ? "text-sm text-status-open" : "text-sm text-destructive"}>
            {pwdMessage.text}
          </p>
        )}
        <Button type="submit" variant="secondary" disabled={pwdPending || !currentPassword || !newPassword}>
          {pwdPending ? "更新中…" : "更新密碼"}
        </Button>
      </form>
    </div>
  );
}
