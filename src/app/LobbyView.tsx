"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hero } from "@/components/lobby/Hero";
import { CourseCard } from "@/components/lobby/CourseCard";
import { CourseFilterBar, COURSE_TYPES } from "@/components/lobby/CourseFilterBar";
import type { LobbyCourse } from "@/db/queries/courses";

const PAGE_SIZE = 5;
const HERO_DISMISSED_KEY = "school-match:entered-lobby";

export function LobbyView({
  courses,
  currentSchoolId,
  isLoggedIn,
  topBar,
}: {
  courses: LobbyCourse[];
  currentSchoolId: string | null;
  isLoggedIn: boolean;
  topBar: React.ReactNode;
}) {
  const [showHero, setShowHero] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [day, setDay] = useState("全部時間");
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<"seeking" | "closed">("seeking");

  useEffect(() => {
    // Default to showing the hero for SSR/hydration consistency, then sync
    // from sessionStorage once mounted (can't read storage during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHero(sessionStorage.getItem(HERO_DISMISSED_KEY) !== "1");
  }, []);

  function enterLobby() {
    sessionStorage.setItem(HERO_DISMISSED_KEY, "1");
    setShowHero(false);
  }

  function toggleType(type: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setPage(0);
  }

  const seekingCount = useMemo(() => courses.filter((c) => c.isSeeking).length, [courses]);
  const closedCount = courses.length - seekingCount;

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = courses.filter((c) => {
      if (c.isSeeking !== (tab === "seeking")) return false;
      if (day !== "全部時間" && !c.timeSlots.some((slot) => slot.dayOfWeek === day)) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(c.courseType)) return false;
      if (keyword) {
        const haystack = `${c.title} ${c.syllabus ?? ""}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
    result.sort(
      (a, b) => COURSE_TYPES.indexOf(a.courseType as (typeof COURSE_TYPES)[number]) -
        COURSE_TYPES.indexOf(b.courseType as (typeof COURSE_TYPES)[number])
    );
    return result;
  }, [courses, search, selectedTypes, day, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  if (showHero) {
    return <Hero onEnterLobby={enterLobby} />;
  }

  return (
    <div>
      {topBar}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-6 flex items-center gap-2 page-heading">
          <BookOpen className="size-6 text-primary" />
          課程大廳
        </h1>

        <Tabs
          className="mb-4"
          value={tab}
          onValueChange={(v) => {
            setTab(v as "seeking" | "closed");
            setPage(0);
          }}
        >
          <TabsList>
            <TabsTrigger value="seeking">尚在尋求合作學校（{seekingCount}）</TabsTrigger>
            <TabsTrigger value="closed">已找到合作學校（{closedCount}）</TabsTrigger>
          </TabsList>
        </Tabs>

        <CourseFilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          selectedTypes={selectedTypes}
          onToggleType={toggleType}
          day={day}
          onDayChange={(v) => {
            setDay(v);
            setPage(0);
          }}
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">目前沒有符合條件的課程，試試調整篩選條件。</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              共 <strong>{filtered.length}</strong> 門課程　第 {clampedPage + 1} / {totalPages} 頁
            </p>
            <div className="flex flex-col gap-4">
              {pageItems.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  currentSchoolId={currentSchoolId}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={clampedPage === 0}
                onClick={() => setPage(clampedPage - 1)}
              >
                ◀
              </Button>
              <span className="text-sm text-muted-foreground">
                {clampedPage + 1} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={clampedPage >= totalPages - 1}
                onClick={() => setPage(clampedPage + 1)}
              >
                ▶
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
