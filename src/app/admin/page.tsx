import { ClipboardList, Handshake, LayoutDashboard, School, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLobbyCourses } from "@/db/queries/courses";
import { getApplicantSchoolStats } from "@/db/queries/matches";
import { getAllRegistry } from "@/db/queries/registry";
import { getAllSchools } from "@/db/queries/schools";
import { requireRole } from "@/lib/auth";
import { SchoolAccountsTab } from "./SchoolAccountsTab";
import { MatchStatsTab } from "./MatchStatsTab";
import { RegistryTab } from "./RegistryTab";
import { CreateAdminForm } from "./CreateAdminForm";

export default async function AdminPage() {
  await requireRole(["SiteAdmin"]);

  const [schools, courses, applicantStats, registry] = await Promise.all([
    getAllSchools(),
    getLobbyCourses(),
    getApplicantSchoolStats(),
    getAllRegistry(),
  ]);

  const registeredNames = new Set(schools.map((s) => s.name));
  const unregisteredNames = registry
    .map((r) => r.name)
    .filter((name) => !registeredNames.has(name));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="mb-6 flex items-center gap-2 page-heading">
        <LayoutDashboard className="size-6 text-primary" />
        系統管理
      </h1>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-1.5">
            <School className="size-3.5" />
            學校帳號基本資訊
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <Handshake className="size-3.5" />
            配對狀況
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-1.5">
            <ClipboardList className="size-3.5" />
            學校清單管理
          </TabsTrigger>
          <TabsTrigger value="create-admin" className="gap-1.5">
            <UserPlus className="size-3.5" />
            新增管理員
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="pt-4">
          <SchoolAccountsTab schools={schools} unregisteredNames={unregisteredNames} />
        </TabsContent>

        <TabsContent value="stats" className="pt-4">
          <MatchStatsTab courses={courses} applicantStats={applicantStats} />
        </TabsContent>

        <TabsContent value="registry" className="pt-4">
          <RegistryTab registry={registry} />
        </TabsContent>

        <TabsContent value="create-admin" className="pt-4">
          <div className="card-shadow max-w-md rounded-lg border border-border bg-card p-8">
            <CreateAdminForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
