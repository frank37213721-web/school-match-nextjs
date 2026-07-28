"use client";

import { HeartHandshake, MessageCircleQuestion } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ACKNOWLEDGEMENTS = [
  { role: "指導單位", name: "前導學校計劃核心小組" },
  { role: "感謝指導", name: "臺灣師範大學 陳佩英教授" },
  { role: "", name: "高雄市三民高中 紀雅齡主任" },
  { role: "", name: "台北陽明高中 蔡哲銘校長" },
  { role: "", name: "國家教育研究院 陳逸年主任" },
  { role: "", name: "台南一中 謝承霖主任" },
  { role: "", name: "前導學校核心小組成員" },
];

export function AboutButtons() {
  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger
          render={
            <Button variant="secondary" size="sm">
              <HeartHandshake className="size-4" />
              致謝
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>關於本平台的建立特別感謝</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            {ACKNOWLEDGEMENTS.map((item, i) => (
              <div key={i}>
                {item.role && (
                  <p className="mb-0.5 text-xs font-medium text-muted-foreground">{item.role}</p>
                )}
                <p className="text-foreground">{item.name}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger
          render={
            <Button variant="secondary" size="sm">
              <MessageCircleQuestion className="size-4" />
              問題與建議
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>問題與建議</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-foreground">網站作者：高雄市三民高中 謝孟翔老師</p>
            <p className="text-muted-foreground">
              聯繫：
              <a
                href="mailto:harryhsieh@smhs.kh.edu.tw"
                className="text-primary underline underline-offset-2"
              >
                harryhsieh@smhs.kh.edu.tw
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
