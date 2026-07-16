"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero({ onEnterLobby }: { onEnterLobby: () => void }) {
  return (
    <div className="hero-gradient flex min-h-screen w-full flex-col items-center justify-center px-6 text-center text-white">
      <div className="mb-5 text-sm font-medium uppercase tracking-[0.15em] text-[#2997ff]">
        教育 × 合作 × 創新
      </div>
      <h1 className="mb-5 max-w-3xl text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight">
        跨校課程匯流平台
      </h1>
      <p className="mb-16 text-[clamp(1rem,2.5vw,1.4rem)] font-light text-white/80">
        Connecting everyone with curriculum
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/login" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
          學校帳號 Sign in / Sign Up
        </Link>
        <Button size="lg" onClick={onEnterLobby}>
          進入課程大廳 →
        </Button>
      </div>
    </div>
  );
}
