import "server-only"

import { createHmac } from "node:crypto"

import { prisma } from "@/lib/prisma"

type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetAt: Date
}

type ConsumeRateLimitOptions = {
  namespace: string
  identifier: string
  limit: number
  windowMs: number
}

const MAX_TRANSACTION_RETRIES = 3

function hashRateLimitKey(namespace: string, identifier: string) {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "local-rate-limit-secret"

  return createHmac("sha256", secret)
    .update(`${namespace}:${identifier}`)
    .digest("hex")
}

function getRetryAfterSeconds(expiresAt: Date, now: Date) {
  return Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000))
}

function isTransactionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  )
}

export function getClientIp(request: Request) {
  const headers = request.headers
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim()

  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    forwardedFor ||
    "unknown"
  ).slice(0, 128)
}

export async function consumeRateLimit({
  namespace,
  identifier,
  limit,
  windowMs,
}: ConsumeRateLimitOptions): Promise<RateLimitResult> {
  const key = hashRateLimitKey(namespace, identifier)

  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const now = new Date()
          const expiresAt = new Date(now.getTime() + windowMs)
          const existing = await transaction.authRateLimit.findUnique({
            where: { key },
          })

          if (!existing || existing.expiresAt <= now) {
            const current = await transaction.authRateLimit.upsert({
              where: { key },
              create: {
                key,
                attempts: 1,
                windowStartedAt: now,
                expiresAt,
              },
              update: {
                attempts: 1,
                windowStartedAt: now,
                expiresAt,
              },
            })

            return {
              allowed: true,
              limit,
              remaining: Math.max(0, limit - current.attempts),
              retryAfterSeconds: getRetryAfterSeconds(current.expiresAt, now),
              resetAt: current.expiresAt,
            }
          }

          if (existing.attempts >= limit) {
            return {
              allowed: false,
              limit,
              remaining: 0,
              retryAfterSeconds: getRetryAfterSeconds(existing.expiresAt, now),
              resetAt: existing.expiresAt,
            }
          }

          const current = await transaction.authRateLimit.update({
            where: { key },
            data: { attempts: { increment: 1 } },
          })

          return {
            allowed: true,
            limit,
            remaining: Math.max(0, limit - current.attempts),
            retryAfterSeconds: getRetryAfterSeconds(current.expiresAt, now),
            resetAt: current.expiresAt,
          }
        },
        { isolationLevel: "Serializable" },
      )
    } catch (error) {
      if (isTransactionConflict(error) && attempt < MAX_TRANSACTION_RETRIES - 1) {
        continue
      }
      throw error
    }
  }

  throw new Error("Rate limit transaction failed")
}
