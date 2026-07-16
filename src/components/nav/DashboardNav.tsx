import Link from "next/link";
import {
  BookOpen,
  Building2,
  Handshake,
  Home,
  LayoutDashboard,
  LogOut,
  PencilLine,
} from "lucide-react";
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
    { href: "/", label: "課程大廳", icon: Home },
    { href: "/dashboard/courses", label: "本校開課課程", icon: BookOpen },
    { href: "/dashboard/courses/manage", label: "新增/修改課程", icon: PencilLine },
    { href: "/dashboard/matches", label: "配對情形", icon: Handshake, badge: pendingMatchesCount },
    { href: "/dashboard/school-info", label: "學校基本資料", icon: Building2 },
  ];

  return (
    <aside className="w-full shrink-0 border-b border-sidebar-border bg-sidebar md:w-64 md:border-r md:border-b-0">
      <div className="px-5 pt-8 pb-5">
        <div className="mb-1.5 text-[0.65rem] font-semibold tracking-[0.2rem] text-muted-foreground uppercase">
          單位
        </div>
        <div className="text-[1.05rem] leading-snug font-semibold tracking-tight text-sidebar-foreground">
          {school.name}
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 pb-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-[0.9rem] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="flex items-center gap-2.5">
              <link.icon className="size-4 text-muted-foreground" />
              {link.label}
            </span>
            {!!link.badge && (
              <Badge className="bg-primary text-primary-foreground">{link.badge}</Badge>
            )}
          </Link>
        ))}
        {school.role === "SiteAdmin" && (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[0.9rem] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LayoutDashboard className="size-4 text-muted-foreground" />
            系統管理
          </Link>
        )}
      </nav>
      <div className="mx-3 border-t border-sidebar-border pt-2">
        <form action="/logout" method="post" className="px-3 pb-3">
          <button
            type="submit"
            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[0.9rem] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            登出
          </button>
        </form>
      </div>
    </aside>
  );
}
