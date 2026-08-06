import type { NextAuthConfig } from "next-auth";
import { isAdminEmail } from "@/lib/admin-access";

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
      const isAdminAuthPage = /^\/(en|vi|th)?\/?admin\/login/.test(pathname);
      const isUnauthorizedPage = /^\/(en|vi|th)?\/?admin\/unauthorized/.test(pathname);
      const isStoreAuthPage = /^\/(en|vi|th)?\/?(login|register)/.test(pathname);

      if (isUnauthorizedPage) {
        return true;
      }

      if (isAdminAuthPage) {
        if (isLoggedIn) {
          if (isAdminEmail(auth?.user?.email)) {
            return Response.redirect(new URL(`${localePrefix}/admin`, nextUrl));
          } else {
            return Response.redirect(new URL(`${localePrefix}/admin/unauthorized`, nextUrl));
          }
        }
        return true;
      }

      if (isStoreAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(`${localePrefix || '/en'}/account`, nextUrl));
        }
        return true;
      }

      if (isAdminRoute) {
        if (isLoggedIn) {
          if (isAdminEmail(auth?.user?.email)) return true;
          return Response.redirect(new URL(`${localePrefix}/admin/unauthorized`, nextUrl));
        }
        return false; // Redirect unauthorized users to login page
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
