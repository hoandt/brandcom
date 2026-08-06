import { NextResponse } from "next/server";

import {
  formatVietnamesePhone,
  normalizeVietnamesePhone,
  PhoneOtpError,
} from "@/lib/auth/phone-otp";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import {
  requestZaloOtp,
  ZaloOtpServiceError,
} from "@/lib/auth/zalo-otp-service";

const DEFAULT_IP_LIMIT = 3;
const DEFAULT_IP_WINDOW_SECONDS = 5 * 60;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getIpRateLimitConfig() {
  return {
    limit: positiveInteger(
      process.env.ZALO_OTP_SEND_IP_LIMIT,
      DEFAULT_IP_LIMIT,
    ),
    windowSeconds: positiveInteger(
      process.env.ZALO_OTP_SEND_IP_WINDOW_SECONDS,
      DEFAULT_IP_WINDOW_SECONDS,
    ),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: unknown };
    if (typeof body.phone !== "string") {
      return NextResponse.json(
        { success: false, code: "INVALID_PHONE" },
        { status: 400 },
      );
    }

    normalizeVietnamesePhone(body.phone);

    const { limit, windowSeconds } = getIpRateLimitConfig();
    const rateLimit = await consumeRateLimit({
      namespace: "zalo-otp-send-ip",
      identifier: getClientIp(request),
      limit,
      windowMs: windowSeconds * 1000,
    });
    const rateLimitHeaders = {
      "RateLimit-Limit": String(rateLimit.limit),
      "RateLimit-Remaining": String(rateLimit.remaining),
      "RateLimit-Reset": String(Math.ceil(rateLimit.resetAt.getTime() / 1000)),
    };

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: "RATE_LIMITED",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const challenge = await requestZaloOtp(body.phone);

    return NextResponse.json(
      {
        success: true,
        data: {
          phone: formatVietnamesePhone(challenge.phone),
          expiresInSeconds: challenge.expiresInSeconds,
          resendAfterSeconds: challenge.resendAfterSeconds,
        },
      },
      { headers: rateLimitHeaders },
    );
  } catch (error) {
    if (error instanceof PhoneOtpError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
        },
        { status: 400 },
      );
    }

    if (error instanceof ZaloOtpServiceError) {
      console.error("[ZALO_OTP_SERVICE_ERROR]", {
        code: error.code,
        providerStatus: error.providerStatus,
        retryAfterSeconds: error.retryAfterSeconds,
      });

      if (error.code === "RATE_LIMITED") {
        return NextResponse.json(
          {
            success: false,
            code: "RATE_LIMITED",
            retryAfterSeconds: error.retryAfterSeconds,
          },
          {
            status: 429,
            headers: error.retryAfterSeconds
              ? { "Retry-After": String(error.retryAfterSeconds) }
              : undefined,
          },
        );
      }

      return NextResponse.json(
        { success: false, code: "OTP_DELIVERY_UNAVAILABLE" },
        { status: 503 },
      );
    }

    console.error("[ZALO_OTP_SEND]", error);
    return NextResponse.json(
      { success: false, code: "OTP_DELIVERY_UNAVAILABLE" },
      { status: 500 },
    );
  }
}
