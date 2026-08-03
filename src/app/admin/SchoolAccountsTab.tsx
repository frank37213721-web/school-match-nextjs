"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Mail,
  Pencil,
  Save,
  School,
  Square,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminUpdateSchoolProfile, deleteSchoolCascade } from "@/actions/admin";
import { toast } from "@/lib/toast";

const DISTRICTS = ["", "北一區", "北二區", "北三區", "中區", "南區", "其他"] as const;

type SchoolRow = {
  id: string;
  name: string;
  district: string | null;
  phone: string;
  registrantName: string;
  registrantExtension: string | null;
  registrantEmail: string;
  academicDirectorEmail: string | null;
  principalEmail: string | null;
  isHost: boolean;
  isPartner: boolean;
};

export function SchoolAccountsTab({
  schools,
  unregisteredNames,
}: {
  schools: SchoolRow[];
  unregisteredNames: string[];
}) {
  const [districtFilter, setDistrictFilter] = useState("全部");
  const districts = useMemo(
    () => ["全部", ...new Set(schools.map((s) => s.district ?? "（未分區）"))],
    [schools]
  );

  const filtered = schools.filter(
    (s) => districtFilter === "全部" || (s.district ?? "（未分區）") === districtFilter
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-xs">
        <Select value={districtFilter} onValueChange={(v) => v && setDistrictFilter(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
          <CheckCircle2 className="size-4 text-status-open" />
          已註冊學校
        </p>
        <div className="flex flex-col gap-2">
          {filtered.map((s) => (
            <SchoolRowItem key={s.id} school={s} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
          <Square className="size-4 text-muted-foreground" />
          尚未註冊學校
        </p>
        {unregisteredNames.length === 0 ? (
          <p className="text-sm text-muted-foreground">所有學校皆已註冊帳號。</p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {unregisteredNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SchoolRowItem({ school }: { school: SchoolRow }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSchoolCascade(school.id);
      if (!result.ok) {
        toast.error(result.error, "刪除失敗");
        return;
      }
      toast.success(`「${school.name}」已刪除。`, "已刪除");
      router.refresh();
    });
  }

  return (
    <details className="overflow-hidden rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        <School className="size-4 text-muted-foreground" />
        {school.name}　（{school.district ?? "未分區"}）
      </summary>

      {editing ? (
        <SchoolEditForm
          school={school}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 px-4 pb-4 text-sm sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 font-medium">
                <ClipboardList className="size-3.5 text-muted-foreground" />
                基本資料
              </p>
              <p>電話：{school.phone}</p>
              <p>分機：{school.registrantExtension ?? "—"}</p>
              <p>承辦人：{school.registrantName}</p>
              <p>承辦人 Email：{school.registrantEmail}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-medium">
                <Mail className="size-3.5 text-muted-foreground" />
                主管信箱
              </p>
              <p>處室主任：{school.academicDirectorEmail ?? "—"}</p>
              <p>校長：{school.principalEmail ?? "—"}</p>
              <p className="mt-2 flex items-center gap-1.5 font-medium">
                <GraduationCap className="size-3.5 text-muted-foreground" />
                權限
              </p>
              <p className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  可開課：
                  {school.isHost ? (
                    <CheckCircle2 className="size-4 text-status-open" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                </span>
                <span className="inline-flex items-center gap-1">
                  可合作：
                  {school.isPartner ? (
                    <CheckCircle2 className="size-4 text-status-open" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            {confirming ? (
              <>
                <p className="text-sm text-status-partial">
                  確定要刪除「{school.name}」？將同時刪除所有課程與配對記錄，且無法復原。
                </p>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
                  <CheckCircle2 className="size-4" />
                  確認刪除
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                  <X className="size-4" />
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" />
                  編輯基本資訊
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
                  <Trash2 className="size-4" />
                  刪除「{school.name}」
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </details>
  );
}

function SchoolEditForm({
  school,
  onCancel,
  onSaved,
}: {
  school: SchoolRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(school.name);
  const [district, setDistrict] = useState<(typeof DISTRICTS)[number]>(
    (school.district as (typeof DISTRICTS)[number]) ?? ""
  );
  const [phone, setPhone] = useState(school.phone);
  const [registrantName, setRegistrantName] = useState(school.registrantName);
  const [registrantExtension, setRegistrantExtension] = useState(school.registrantExtension ?? "");
  const [registrantEmail, setRegistrantEmail] = useState(school.registrantEmail);
  const [academicDirectorEmail, setAcademicDirectorEmail] = useState(
    school.academicDirectorEmail ?? ""
  );
  const [principalEmail, setPrincipalEmail] = useState(school.principalEmail ?? "");
  const [isHost, setIsHost] = useState(school.isHost);
  const [isPartner, setIsPartner] = useState(school.isPartner);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await adminUpdateSchoolProfile(school.id, {
        name,
        district,
        phone,
        registrantName,
        registrantExtension,
        registrantEmail,
        academicDirectorEmail,
        principalEmail,
        isHost,
        isPartner,
      });
      if (!result.ok) {
        toast.error(result.error, "更新失敗");
        return;
      }
      toast.success(`「${name}」的基本資訊已更新。`, "已儲存");
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border px-4 py-4 text-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>學校名稱</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>學校分區</Label>
          <Select
            value={district}
            onValueChange={(v) => setDistrict((v as (typeof DISTRICTS)[number]) ?? "")}
          >
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
        <div className="flex flex-col gap-1.5">
          <Label>學校電話（登入帳號）</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>承辦人分機</Label>
          <Input value={registrantExtension} onChange={(e) => setRegistrantExtension(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>承辦人姓名</Label>
          <Input value={registrantName} onChange={(e) => setRegistrantName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>承辦人 Email</Label>
          <Input
            type="email"
            value={registrantEmail}
            onChange={(e) => setRegistrantEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>處室主任 Email</Label>
          <Input
            type="email"
            value={academicDirectorEmail}
            onChange={(e) => setAcademicDirectorEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>校長 Email</Label>
          <Input type="email" value={principalEmail} onChange={(e) => setPrincipalEmail(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Label className="flex items-center gap-2">
          <Checkbox checked={isHost} onCheckedChange={(v) => setIsHost(v === true)} />
          可開課
        </Label>
        <Label className="flex items-center gap-2">
          <Checkbox checked={isPartner} onCheckedChange={(v) => setIsPartner(v === true)} />
          可合作
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="size-4" />
          儲存
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={pending}>
          <X className="size-4" />
          取消
        </Button>
      </div>
    </form>
  );
}
