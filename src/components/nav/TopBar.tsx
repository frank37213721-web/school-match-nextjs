import Link from "next/link";
import { BookOpen, LayoutDashboard, LogOut } from "lucide-react";
import { getCurrentSchool } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { AboutButtons } from "@/components/lobby/AboutButtons";

export async function TopBar() {
  const school = await getCurrentSchool();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/90 px-6 py-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <BookOpen className="size-4" />
          跨校課程匯流平台
        </Link>
        <AboutButtons />
      </div>
      <nav className="flex items-center gap-4 text-sm">
        {school ? (
          <>
            <span className="text-muted-foreground">{school.name}</span>
            <Link
              href={school.role === "SiteAdmin" ? "/admin" : "/dashboard/courses"}
              className="flex items-center gap-1.5 font-medium text-primary hover:text-[var(--primary-hover)]"
            >
              {school.role === "SiteAdmin" && <LayoutDashboard className="size-4" />}
              {school.role === "SiteAdmin" ? "系統管理" : "管理中心"}
            </Link>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="size-4" />
                登出
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            學校帳號登入 / 註冊
          </Link>
        )}
      </nav>
    </header>
  );
}
