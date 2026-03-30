import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login?error=AccessDenied", // Error code passed in query string
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname.startsWith("/login");

      if (isOnLoginPage) {
        if (isLoggedIn)
          return Response.redirect(new URL("/employees/active", nextUrl));
        return true;
      }

      if (!isLoggedIn) return false;

      // Restrict /reports to Admin and Manager roles
      if (nextUrl.pathname.startsWith("/reports")) {
        const accessLevel = (auth?.user as any)?.accessLevel;
        if (accessLevel !== "Admin" && accessLevel !== "Manager") {
          return Response.redirect(new URL("/", nextUrl));
        }
      }

      return true;
    },
    // Expose accessLevel in the session so the authorized callback above can read it
    session({ session, token }) {
      if (token && session.user) {
        (session.user as any).accessLevel = (token as any).accessLevel;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
