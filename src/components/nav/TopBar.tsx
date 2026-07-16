import Link from "next/link";
import { getCurrentSchool } from "@/lib/auth";

export async function TopBar() {
  const school = await getCurrentSchool();

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <Link href="/" className="text-sm font-medium tracking-wide text-foreground">
        📚 跨校課程匯流平台
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {school ? (
          <>
            <span className="text-muted-foreground">{school.name}</span>
            <Link href={school.role === "SiteAdmin" ? "/admin" : "/dashboard/courses"} className="text-primary">
              {school.role === "SiteAdmin" ? "📊 系統管理" : "管理中心"}
            </Link>
            <form action="/logout" method="post">
              <button type="submit" className="text-muted-foreground hover:text-foreground">
                登出
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="text-primary">
            學校帳號登入 / 註冊
          </Link>
        )}
      </nav>
    </header>
  );
}
