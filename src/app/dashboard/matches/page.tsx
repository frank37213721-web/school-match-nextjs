import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIncomingMatches, getOutgoingMatches } from "@/db/queries/matches";
import { requireUser } from "@/lib/auth";
import { IncomingMatchesTab } from "./IncomingMatchesTab";
import { OutgoingMatchesTab } from "./OutgoingMatchesTab";

export default async function MatchesPage() {
  const school = await requireUser();
  const [incoming, outgoing] = await Promise.all([
    getIncomingMatches(school.id),
    getOutgoingMatches(school.id),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-medium tracking-wide">🤝 課程配對進度追蹤</h1>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList>
          <TabsTrigger value="incoming">我是開課學校（收到的申請）</TabsTrigger>
          <TabsTrigger value="outgoing">我是合作學校（寄出的申請）</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="pt-4">
          <p className="mb-4 text-sm font-medium">📩 收到其他學校的配對請求</p>
          <IncomingMatchesTab matches={incoming} />
        </TabsContent>

        <TabsContent value="outgoing" className="pt-4">
          <p className="mb-4 text-sm font-medium">📤 已寄出的配對請求</p>
          <OutgoingMatchesTab matches={outgoing} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
