import { Lock } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div>
      <TopBar />
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-16">
        <h1 className="mb-8 flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          <Lock className="size-5 text-primary" />
          設定新密碼
        </h1>
        <div className="card-shadow w-full rounded-lg border border-border bg-card p-8">
          <ResetPasswordForm token={token ?? null} />
        </div>
      </div>
    </div>
  );
}
