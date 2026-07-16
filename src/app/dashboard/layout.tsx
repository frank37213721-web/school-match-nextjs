import { countPendingIncomingMatches } from "@/db/queries/matches";
import { requireUser } from "@/lib/auth";
import { DashboardNav } from "@/components/nav/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const school = await requireUser();
  const pendingMatchesCount = await countPendingIncomingMatches(school.id);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <DashboardNav school={school} pendingMatchesCount={pendingMatchesCount} />
      <main className="min-w-0 flex-1 px-8 py-10">{children}</main>
    </div>
  );
}
