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
      <h1 className="mb-6 text-xl font-medium tracking-wide">📊 系統管理</h1>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts">🏫 學校帳號基本資訊</TabsTrigger>
          <TabsTrigger value="stats">🤝 配對狀況</TabsTrigger>
          <TabsTrigger value="registry">📋 學校清單管理</TabsTrigger>
          <TabsTrigger value="create-admin">👨‍💼 新增管理員</TabsTrigger>
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
          <CreateAdminForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
