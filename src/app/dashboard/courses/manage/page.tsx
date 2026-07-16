import { PencilLine } from "lucide-react";
import { getCoursesForSchool } from "@/db/queries/courses";
import { requireUser } from "@/lib/auth";
import { CoursesManageView } from "./CoursesManageView";

export default async function CoursesManagePage() {
  const school = await requireUser();
  const courses = await getCoursesForSchool(school.id);

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 page-heading">
        <PencilLine className="size-6 text-primary" />
        管理您的課程
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">開課單位：{school.name}</p>
      <CoursesManageView courses={courses} />
    </div>
  );
}
