"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, ListPlus, Pencil, Save, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addRegistryRow,
  bulkImportRegistryFromSeed,
  confirmRegistryImport,
  deleteRegistryRow,
  previewRegistryImport,
  updateRegistryRow,
  type RegistryDiff,
} from "@/actions/admin";
import type { RegistryRow } from "@/lib/excel";

type RegistryEntry = { id: number; code: string | null; name: string; district: string | null };

export function RegistryTab({ registry }: { registry: RegistryEntry[] }) {
  const router = useRouter();
  const [districtFilter, setDistrictFilter] = useState("全部（含未分區）");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const districts = useMemo(
    () => ["全部（含未分區）", "（未分區）", ...new Set(registry.map((r) => r.district).filter(Boolean) as string[])],
    [registry]
  );

  const filtered = registry.filter((r) => {
    if (districtFilter === "（未分區）" && r.district) return false;
    if (
      districtFilter !== "全部（含未分區）" &&
      districtFilter !== "（未分區）" &&
      r.district !== districtFilter
    )
      return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        此清單決定學校帳號申請頁面可選擇的學校。代碼欄位供學校申請時快速帶入學校名稱。
      </p>

      <BulkImportSection onDone={() => router.refresh()} />
      <ExportSection />
      <ImportUploadSection onDone={() => router.refresh()} />

      <div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="輸入關鍵字..." />
        </div>

        <p className="mb-2 text-sm text-muted-foreground">
          顯示 <strong>{filtered.length}</strong> 筆（共 {registry.length} 筆）
        </p>

        <div className="flex flex-col divide-y divide-border border-y border-border">
          {filtered.map((row) =>
            editingId === row.id ? (
              <RegistryEditRow key={row.id} row={row} onDone={() => setEditingId(null)} />
            ) : (
              <RegistryDisplayRow
                key={row.id}
                row={row}
                onEdit={() => setEditingId(row.id)}
                onDeleted={() => router.refresh()}
              />
            )
          )}
        </div>
      </div>

      <AddRegistrySection onDone={() => router.refresh()} />
    </div>
  );
}

function RegistryDisplayRow({
  row,
  onEdit,
  onDeleted,
}: {
  row: RegistryEntry;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteRegistryRow(row.id);
      onDeleted();
    });
  }

  return (
    <div className="grid grid-cols-[80px_1fr_100px_auto_auto] items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted">
      <span>{row.code ?? "—"}</span>
      <span>{row.name}</span>
      <span>{row.district ?? "—"}</span>
      <button onClick={onEdit} className="text-primary" aria-label="編輯">
        <Pencil className="size-4" />
      </button>
      <button onClick={handleDelete} disabled={pending} className="text-destructive" aria-label="刪除">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function RegistryEditRow({ row, onDone }: { row: RegistryEntry; onDone: () => void }) {
  const [code, setCode] = useState(row.code ?? "");
  const [name, setName] = useState(row.name);
  const [district, setDistrict] = useState(row.district ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateRegistryRow(row.id, { code, name, district });
      onDone();
    });
  }

  return (
    <div className="grid grid-cols-[80px_1fr_100px_auto_auto] items-center gap-3 rounded-md bg-muted/40 px-2 py-2">
      <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-7" />
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7" />
      <Input value={district} onChange={(e) => setDistrict(e.target.value)} className="h-7" />
      <button onClick={handleSave} disabled={pending} className="text-primary" aria-label="儲存">
        <Save className="size-4" />
      </button>
      <button onClick={onDone} className="text-muted-foreground" aria-label="取消">
        <X className="size-4" />
      </button>
    </div>
  );
}

function BulkImportSection({ onDone }: { onDone: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleImport() {
    startTransition(async () => {
      const result = await bulkImportRegistryFromSeed();
      setMessage(`匯入完成：新增 ${result.added} 筆，略過 ${result.skipped} 筆`);
      onDone();
    });
  }

  return (
    <details className="overflow-hidden rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        <ListPlus className="size-4 text-muted-foreground" />
        從內建學校代碼表批次匯入
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <p className="text-sm text-muted-foreground">已存在的學校名稱不會重複匯入。</p>
        <Button className="w-fit" onClick={handleImport} disabled={pending}>
          {pending ? "匯入中…" : "開始匯入"}
        </Button>
        {message && <p className="text-sm text-status-open">{message}</p>}
      </div>
    </details>
  );
}

function ExportSection() {
  return (
    <a href="/api/admin/registry/export">
      <Button variant="secondary" className="w-fit">
        <Download className="size-4" />
        下載目前學校清單（Excel）
      </Button>
    </a>
  );
}

function ImportUploadSection({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [diff, setDiff] = useState<RegistryDiff | null>(null);
  const [deleteMissing, setDeleteMissing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePreview() {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await previewRegistryImport(formData);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setDiff(result);
    });
  }

  function handleConfirm() {
    if (!diff) return;
    startTransition(async () => {
      const rows: RegistryRow[] = [
        ...diff.added,
        ...diff.updated.map((u) => u.to),
      ];
      const result = await confirmRegistryImport(rows, deleteMissing);
      setMessage(
        `✅ 完成：新增 ${result.added} 筆，更新 ${result.updated} 筆${
          deleteMissing ? `，刪除 ${result.deleted} 筆` : ""
        }`
      );
      setDiff(null);
      setFile(null);
      onDone();
    });
  }

  return (
    <details className="overflow-hidden rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        <Upload className="size-4 text-muted-foreground" />
        選擇 Excel 檔案（.xlsx）上傳
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <Button className="w-fit" variant="secondary" onClick={handlePreview} disabled={!file || pending}>
          預覽差異
        </Button>

        {diff && (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3 text-sm">
            <p>
              新增 {diff.added.length} 筆　更新 {diff.updated.length} 筆　未變動 {diff.unchanged} 筆
            </p>
            {diff.missingFromUpload.length > 0 && (
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deleteMissing}
                    onChange={(e) => setDeleteMissing(e.target.checked)}
                  />
                  同時刪除上傳檔案中缺少的 {diff.missingFromUpload.length} 筆現有資料
                </label>
              </div>
            )}
            <Button className="w-fit" onClick={handleConfirm} disabled={pending}>
              <Check className="size-4" />
              {pending ? "處理中…" : "確認匯入"}
            </Button>
          </div>
        )}

        {message && <p className="text-sm text-status-open">{message}</p>}
      </div>
    </details>
  );
}

function AddRegistrySection({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    setMessage(null);
    startTransition(async () => {
      const result = await addRegistryRow({ code, name, district });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setCode("");
      setName("");
      setDistrict("");
      onDone();
    });
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium">新增學校</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="代碼（選填）" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="學校名稱" />
        <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="分區（選填）" />
      </div>
      {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
      <Button className="mt-3 w-fit" onClick={handleAdd} disabled={pending}>
        新增
      </Button>
    </div>
  );
}
