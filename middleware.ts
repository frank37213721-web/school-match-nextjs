import { auth } from "@/lib/neon-auth";

// Refreshes the session cookie (and redirects unauthenticated visits) for the
// authenticated sections of the app. Without this, the session cache cookie
// expires every 5 minutes and the next Server Component render that calls
// auth.getSession() crashes with "Cookies can only be modified in a Server
// Action or Route Handler" — this middleware does that refresh up front,
// where writing cookies is allowed.
export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
