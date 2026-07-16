"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteSchoolCascade } from "@/actions/admin";

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
        <p className="mb-3 text-sm font-medium">✅ 已註冊學校</p>
        <div className="flex flex-col gap-2">
          {filtered.map((s) => (
            <SchoolRowItem key={s.id} school={s} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium">⬜ 尚未註冊學校</p>
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
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteSchoolCascade(school.id);
      router.refresh();
    });
  }

  return (
    <details className="border border-border p-3">
      <summary className="cursor-pointer text-sm">
        🏫 {school.name}　（{school.district ?? "未分區"}）
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium">📋 基本資料</p>
          <p>電話：{school.phone}</p>
          <p>分機：{school.registrantExtension ?? "—"}</p>
          <p>承辦人：{school.registrantName}</p>
          <p>承辦人 Email：{school.registrantEmail}</p>
        </div>
        <div>
          <p className="font-medium">📧 主管信箱</p>
          <p>處室主任：{school.academicDirectorEmail ?? "—"}</p>
          <p>校長：{school.principalEmail ?? "—"}</p>
          <p className="mt-2 font-medium">🎓 權限</p>
          <p>
            可開課：{school.isHost ? "✅" : "❌"}　可合作：{school.isPartner ? "✅" : "❌"}
          </p>
        </div>
      </div>
      <hr className="my-3 border-border" />
      {confirming ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-status-partial">
            ⚠️ 確定要刪除「{school.name}」？將同時刪除所有課程與配對記錄，且無法復原。
          </p>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
            ✅ 確認刪除
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
            ❌ 取消
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
          🗑️ 刪除「{school.name}」
        </Button>
      )}
    </details>
  );
}
