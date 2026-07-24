"use client";

import * as React from "react";
import { Toast } from "@base-ui/react/toast";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toastManager } from "@/lib/toast";

const ICON_BY_TYPE: Record<string, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLOR_BY_TYPE: Record<string, string> = {
  success: "text-status-open",
  error: "text-destructive",
  warning: "text-status-partial",
  info: "text-primary",
};

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((item) => {
    const Icon = ICON_BY_TYPE[item.type ?? ""] ?? Info;
    return (
      <Toast.Root
        key={item.id}
        toast={item}
        className={cn(
          "relative flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4 pr-9 shadow-elevation-3",
          "transition-all duration-200 ease-out",
          "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
          "data-[ending-style]:translate-x-2 data-[ending-style]:opacity-0"
        )}
      >
        <Icon className={cn("mt-0.5 size-5 shrink-0", ICON_COLOR_BY_TYPE[item.type ?? ""])} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Toast.Title className="text-sm font-semibold text-foreground" />
          <Toast.Description className="text-sm text-muted-foreground" />
        </div>
        <Toast.Close
          className="absolute top-3 right-3 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="關閉"
        >
          <X className="size-4" />
        </Toast.Close>
      </Toast.Root>
    );
  });
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} timeout={5000}>
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-100 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none sm:right-6 sm:bottom-6">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
