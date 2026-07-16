import { getLobbyCourses } from "@/db/queries/courses";
import { getCurrentSchool } from "@/lib/auth";
import { TopBar } from "@/components/nav/TopBar";
import { LobbyView } from "./LobbyView";

export default async function HomePage() {
  const [courses, school] = await Promise.all([getLobbyCourses(), getCurrentSchool()]);

  return (
    <LobbyView
      courses={courses}
      currentSchoolId={school?.id ?? null}
      isLoggedIn={!!school}
      topBar={<TopBar />}
    />
  );
}
