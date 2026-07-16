import { getCoursesForSchool } from "@/db/queries/courses";
import { requireUser } from "@/lib/auth";
import { CoursesManageView } from "./CoursesManageView";

export default async function CoursesManagePage() {
  const school = await requireUser();
  const courses = await getCoursesForSchool(school.id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-medium tracking-wide">✍️ 管理您的課程</h1>
      <p className="mb-6 text-sm text-muted-foreground">開課單位：{school.name}</p>
      <CoursesManageView courses={courses} />
    </div>
  );
}
