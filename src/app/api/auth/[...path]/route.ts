import { auth } from "@/lib/neon-auth";

// Handles Neon Auth's own flows: session cookies, password-reset links.
// Our own sign-in/sign-up forms call auth.signIn.email() / auth.signUp.email()
// directly from server actions (see src/actions/schools.ts).
export const { GET, POST } = auth.handler();
