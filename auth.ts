import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { query } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        const result = (await query({
          query:
            "SELECT id, first_name, last_name, access_level, email FROM employees WHERE email = ?",
          values: [user.email],
        })) as any[];

        if (result.length > 0) {
          const employee = result[0];
          (user as any).dbId = employee.id;
          (user as any).accessLevel = employee.access_level;
          return true;
        }

        console.log(
          `Login attempt denied for email: ${user.email} (Not found in active employees)`,
        );
        return false;
      } catch (error) {
        console.error("Error during sign in validation:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).accessLevel = token.accessLevel;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).dbId;
        token.accessLevel = (user as any).accessLevel;
      }
      return token;
    },
  },
});
