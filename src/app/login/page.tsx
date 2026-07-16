import { KeyRound } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div>
      <TopBar />
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-16">
        <h1 className="mb-8 flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          <KeyRound className="size-5 text-primary" />
          學校帳號登入 / 註冊
        </h1>
        <div className="card-shadow w-full rounded-lg border border-border bg-card p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
