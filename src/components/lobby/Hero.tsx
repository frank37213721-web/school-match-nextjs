"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero({ onEnterLobby }: { onEnterLobby: () => void }) {
  return (
    <div className="hero-gradient relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #5645d4, transparent)" }}
      />
      <div className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-white/70 uppercase">
        教育 × 合作 × 創新
      </div>
      <h1 className="relative mb-5 max-w-3xl text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-[-0.03em]">
        跨校課程匯流平台
      </h1>
      <p className="relative mb-16 text-[clamp(1rem,2.5vw,1.4rem)] font-normal text-white/60">
        Connecting everyone with curriculum
      </p>
      <div className="relative flex flex-col gap-4 sm:flex-row">
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "border-white/25 bg-transparent text-white hover:bg-white/10"
          )}
        >
          學校帳號 Sign in / Sign Up
        </Link>
        <Button size="lg" onClick={onEnterLobby}>
          進入課程大廳 →
        </Button>
      </div>
    </div>
  );
}
