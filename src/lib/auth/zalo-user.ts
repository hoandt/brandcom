import "server-only";

import { prisma } from "@/lib/prisma";
import { formatVietnamesePhone } from "@/lib/auth/phone-otp";

function getFrontendHostname() {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null);

  if (!configuredUrl) {
    throw new Error("FRONTEND_URL is required for Zalo user identities");
  }

  try {
    const url = new URL(
      configuredUrl.includes("://")
        ? configuredUrl
        : `https://${configuredUrl}`,
    );
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    throw new Error("FRONTEND_URL is invalid");
  }
}

export function getZaloUserIdentity(phone: string) {
  const displayPhone = formatVietnamesePhone(phone);

  return {
    name: displayPhone,
    email: `${phone}.zalo@${getFrontendHostname()}`,
  };
}

export async function findOrCreateZaloUser(phone: string) {
  const identity = getZaloUserIdentity(phone);

  return prisma.$transaction(async (tx) => {
    const existingByPhone = await tx.user.findUnique({ where: { phone } });

    if (existingByPhone) {
      const name = existingByPhone.name || identity.name;
      const email = existingByPhone.email || identity.email;

      if (name === existingByPhone.name && email === existingByPhone.email) {
        return existingByPhone;
      }

      return tx.user.update({
        where: { id: existingByPhone.id },
        data: { name, email },
      });
    }

    const existingByEmail = await tx.user.findUnique({
      where: { email: identity.email },
    });

    if (existingByEmail) {
      if (existingByEmail.phone && existingByEmail.phone !== phone) {
        throw new Error("Zalo identity conflict");
      }

      return tx.user.update({
        where: { id: existingByEmail.id },
        data: {
          phone,
          name: existingByEmail.name || identity.name,
        },
      });
    }

    return tx.user.create({
      data: {
        phone,
        name: identity.name,
        email: identity.email,
      },
    });
  });
}
