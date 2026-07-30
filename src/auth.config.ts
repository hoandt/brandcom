import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const localeMatch = pathname.match(/^\/(en|vi|th)/);
      const localePrefix = localeMatch ? localeMatch[0] : "";

      const isAdminRoute = /^\/(en|vi|th)?\/?admin/.test(pathname);
      const isAuthPage = /^\/(en|vi|th)?\/?admin\/login/.test(pathname);

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(`${localePrefix}/admin`, nextUrl));
        }
        return true;
      }

      if (isAdminRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  providers: [], // Add providers in auth.ts as they are not edge-compatible
  session: {
    strategy: "jwt"
  },
} satisfies NextAuthConfig;
