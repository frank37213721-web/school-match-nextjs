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
        <h1 className="mb-8 text-lg font-medium tracking-wide">🔐 設定新密碼</h1>
        <ResetPasswordForm token={token ?? null} />
      </div>
    </div>
  );
}
