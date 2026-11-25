import createMiddleware from 'next-intl/middleware';
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const intlMiddleware = createMiddleware({
  locales: ['en', 'vi', 'th'],
  defaultLocale: 'vi',
  localeDetection: false
});

const authMiddleware = NextAuth(authConfig).auth;

export default authMiddleware((req) => {
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - _next (static files)
    // - metadata files (e.g. favicon.ico, sitemap.xml, robots.txt)
    // - public storefront banners
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|banners/).*)',
    // Match all locales
    '/',
    '/(en|vi|th)/:path*'
  ]
};
