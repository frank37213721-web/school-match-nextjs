import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCoursesForSchool } from "@/db/queries/courses";
import { requireUser } from "@/lib/auth";

export default async function MyCoursesPage() {
  const school = await requireUser();
  const courses = await getCoursesForSchool(school.id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-medium tracking-wide">📚 本校開課課程</h1>
      <p className="mb-6 text-sm text-muted-foreground">單位：{school.name}</p>

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">您目前尚未開設任何課程。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>課程名稱</TableHead>
                <TableHead>學年度</TableHead>
                <TableHead>學期</TableHead>
                <TableHead>課程種類</TableHead>
                <TableHead>學分數</TableHead>
                <TableHead>開課時間</TableHead>
                <TableHead>跨校學生上限</TableHead>
                <TableHead>合作學校上限</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.academicYear}</TableCell>
                  <TableCell>{c.semester}</TableCell>
                  <TableCell>{c.courseType}</TableCell>
                  <TableCell>{c.credits ?? 0}</TableCell>
                  <TableCell>
                    {c.dayOfWeek} {String(c.startHour).padStart(2, "0")}:00 ~{" "}
                    {String(c.endHour).padStart(2, "0")}:00
                  </TableCell>
                  <TableCell>{c.maxStudents}</TableCell>
                  <TableCell>{c.maxSchools}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
