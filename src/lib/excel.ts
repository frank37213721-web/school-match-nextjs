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

export type CourseExportRow = {
  hostSchoolName: string;
  title: string;
  courseType: string;
  academicYear: string;
  semester: string;
  dayOfWeek: string;
  startHour: number;
  endHour: number;
  maxSchools: number;
  approvedCount: number;
  pendingCount: number;
};

export async function buildCoursesWorkbookBuffer(rows: CourseExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("課程紀錄");
  sheet.columns = [
    { header: "開課學校", key: "hostSchoolName", width: 20 },
    { header: "課程名稱", key: "title", width: 26 },
    { header: "課程種類", key: "courseType", width: 14 },
    { header: "學年度", key: "academicYear", width: 10 },
    { header: "學期", key: "semester", width: 10 },
    { header: "星期", key: "dayOfWeek", width: 8 },
    { header: "開始時間", key: "startHour", width: 10 },
    { header: "結束時間", key: "endHour", width: 10 },
    { header: "合作學校上限", key: "maxSchools", width: 14 },
    { header: "已配對", key: "approvedCount", width: 10 },
    { header: "待審核", key: "pendingCount", width: 10 },
  ];
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Buffer.from(buffer as any);
}

export type MatchExportRow = {
  id: number;
  courseTitle: string;
  hostSchoolName: string;
  applicantSchoolName: string;
  status: string;
  emailStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function buildMatchesWorkbookBuffer(rows: MatchExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("配對紀錄");
  sheet.columns = [
    { header: "課程名稱", key: "courseTitle", width: 26 },
    { header: "開課學校", key: "hostSchoolName", width: 20 },
    { header: "申請學校", key: "applicantSchoolName", width: 20 },
    { header: "狀態", key: "status", width: 12 },
    { header: "Email 發送狀態", key: "emailStatus", width: 16 },
    { header: "申請時間", key: "createdAt", width: 20 },
    { header: "最後更新時間", key: "updatedAt", width: 20 },
  ];
  for (const row of rows) {
    sheet.addRow({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
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
