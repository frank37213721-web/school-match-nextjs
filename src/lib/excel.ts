import "server-only";
import ExcelJS from "exceljs";

export type RegistryRow = { code: string | null; name: string; district: string | null };

export async function buildRegistryWorkbookBuffer(rows: RegistryRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("學校清單");
  sheet.columns = [
    { header: "代碼", key: "code", width: 12 },
    { header: "學校名稱", key: "name", width: 32 },
    { header: "分區", key: "district", width: 12 },
  ];
  for (const row of rows) {
    sheet.addRow({ code: row.code ?? "", name: row.name, district: row.district ?? "" });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  // exceljs bundles its own (older) @types/node, whose `Buffer` type doesn't
  // structurally match this project's — safe to bridge with `any` here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Buffer.from(buffer as any);
}

const HEADER_ALIASES: Record<string, keyof RegistryRow> = {
  代碼: "code",
  code: "code",
  Code: "code",
  學校名稱: "name",
  name: "name",
  Name: "name",
  分區: "district",
  district: "district",
  District: "district",
};

export async function parseRegistryWorkbook(buffer: ArrayBuffer): Promise<RegistryRow[]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(buffer) as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const columnMap = new Map<number, keyof RegistryRow>();
  headerRow.eachCell((cell, colNumber) => {
    const key = HEADER_ALIASES[String(cell.value ?? "").trim()];
    if (key) columnMap.set(colNumber, key);
  });

  const rows: RegistryRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const key = columnMap.get(colNumber);
      if (!key) return;
      record[key] = cell.value != null ? String(cell.value).trim() : "";
    });
    if (record.name) {
      rows.push({
        code: record.code || null,
        name: record.name,
        district: record.district || null,
      });
    }
  });

  return rows;
}
