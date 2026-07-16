import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CurrentSchool } from "@/lib/auth";

export function DashboardNav({
  school,
  pendingMatchesCount,
}: {
  school: CurrentSchool;
  pendingMatchesCount: number;
}) {
  const links = [
    { href: "/", label: "課程大廳" },
    { href: "/dashboard/courses", label: "本校開課課程" },
    { href: "/dashboard/courses/manage", label: "新增/修改課程" },
    { href: "/dashboard/matches", label: "配對情形", badge: pendingMatchesCount },
    { href: "/dashboard/school-info", label: "學校基本資料" },
  ];

  return (
    <aside className="w-full shrink-0 border-b border-sidebar-border bg-sidebar md:w-64 md:border-r md:border-b-0">
      <div className="px-5 pt-8 pb-5">
        <div className="mb-2 text-[0.65rem] uppercase tracking-[0.2rem] text-muted-foreground">
          單位
        </div>
        <div className="text-[1.05rem] font-medium leading-snug text-sidebar-foreground">
          {school.name}
        </div>
      </div>
      <hr className="mx-5 mb-3 border-sidebar-border" />
      <nav className="flex flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between px-5 py-3 text-[0.95rem] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            {link.label}
            {!!link.badge && <Badge variant="outline">{link.badge}</Badge>}
          </Link>
        ))}
        {school.role === "SiteAdmin" && (
          <Link
            href="/admin"
            className="px-5 py-3 text-[0.95rem] text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            📊 系統管理
          </Link>
        )}
        <form action="/logout" method="post" className="px-5 py-3">
          <button type="submit" className="text-[0.95rem] text-sidebar-foreground hover:underline">
            登出
          </button>
        </form>
      </nav>
    </aside>
  );
}
