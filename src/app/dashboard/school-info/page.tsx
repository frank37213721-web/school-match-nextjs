import { Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SchoolInfoForm } from "@/components/school-info/SchoolInfoForm";

export default async function SchoolInfoPage() {
  const school = await requireUser();

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 page-heading">
        <Building2 className="size-6 text-primary" />
        學校基本資料管理
      </h1>
      <div className="card-shadow max-w-xl rounded-lg border border-border bg-card p-8">
        <SchoolInfoForm school={school} />
      </div>
    </div>
  );
}
