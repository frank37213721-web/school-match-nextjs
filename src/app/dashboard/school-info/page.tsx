import { requireUser } from "@/lib/auth";
import { SchoolInfoForm } from "@/components/school-info/SchoolInfoForm";

export default async function SchoolInfoPage() {
  const school = await requireUser();

  return (
    <div>
      <h1 className="mb-6 text-xl font-medium tracking-wide">🏫 學校基本資料管理</h1>
      <SchoolInfoForm school={school} />
    </div>
  );
}
