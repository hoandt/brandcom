import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getAppleClientSecret } from "./lib/apple-auth";
import { verifyZaloOtp } from "@/lib/auth/zalo-otp-service";
import { findOrCreateZaloUser } from "@/lib/auth/zalo-user";
import { isAdminEmail } from "@/lib/admin-access";
import { normalizeVietnamesePhone } from "@/lib/auth/phone-otp";
import type { NextAuthConfig } from "next-auth";

const providers: NextAuthConfig["providers"] = [];
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

const hasAppleConfiguration = Boolean(
  process.env.NEXT_PUBLIC_APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY,
);

if (hasAppleConfiguration) {
  const appleClientSecret = await getAppleClientSecret();
  providers.push(
    AppleProvider({
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID!,
      clientSecret: appleClientSecret,
    }),
  );
}

providers.push(
  CredentialsProvider({
    id: "customer-credentials",
    name: "Customer phone credentials",
    credentials: {
      phone: { label: "Phone", type: "tel" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (
        typeof credentials?.phone !== "string" ||
        typeof credentials?.password !== "string"
      ) {
        return null;
      }

      let phone: string;
      try {
        phone = normalizeVietnamesePhone(credentials.phone);
      } catch {
        return null;
      }

      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user?.password) return null;

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password,
      );
      if (!isPasswordValid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
  CredentialsProvider({
    id: "admin-credentials",
    name: "Admin credentials",
    credentials: {
      identifier: { label: "Email or phone", type: "text" },
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const identifier =
        typeof credentials?.identifier === "string"
          ? credentials.identifier.trim()
          : typeof credentials?.email === "string"
            ? credentials.email.trim()
            : "";

      if (!identifier || typeof credentials?.password !== "string") {
        return null;
      }

      if (!identifier.includes("@") || !isAdminEmail(identifier)) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
      });

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password as string,
        user.password,
      );

      if (!isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
  CredentialsProvider({
    id: "zalo-otp",
    name: "Zalo OTP",
    credentials: {
      phone: { label: "Phone", type: "tel" },
      otp: { label: "OTP", type: "text" },
    },
    async authorize(credentials) {
      if (
        typeof credentials?.phone !== "string" ||
        typeof credentials?.otp !== "string"
      ) {
        return null;
      }

      const verifiedPhone = await verifyZaloOtp(
        credentials.phone,
        credentials.otp,
      );

      if (!verifiedPhone) return null;

      const user = await findOrCreateZaloUser(verifiedPhone);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  trustHost: true,
  secret:
    authSecret ||
    (process.env.NODE_ENV !== "production"
      ? "local-auth-secret-change-before-production"
      : undefined),
});
