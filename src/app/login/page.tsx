import { TopBar } from "@/components/nav/TopBar";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div>
      <TopBar />
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-16">
        <h1 className="mb-8 text-lg font-medium tracking-wide">🔑 學校帳號登入 / 註冊</h1>
        <LoginForm />
      </div>
    </div>
  );
}
