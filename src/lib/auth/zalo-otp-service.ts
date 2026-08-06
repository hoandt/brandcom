import "server-only";

import { normalizeVietnamesePhone } from "@/lib/auth/phone-otp";

const REQUEST_PATH = "/api/auth/otp/zalo/request";
const VERIFY_PATH = "/api/auth/otp/zalo/verify";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_EXPIRY_SECONDS = 300;
const DEFAULT_RESEND_SECONDS = 60;

type ZaloOtpServiceResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  phone?: string;
  expiresInSeconds?: number;
  retryAfterSeconds?: number;
};

export class ZaloOtpServiceError extends Error {
  constructor(
    public readonly code:
      | "NOT_CONFIGURED"
      | "RATE_LIMITED"
      | "REQUEST_FAILED",
    public readonly retryAfterSeconds?: number,
    public readonly providerStatus?: number,
  ) {
    super(code);
    this.name = "ZaloOtpServiceError";
  }
}

function getServiceUrl(path: string) {
  const baseUrl = process.env.ZALO_OTP_SERVICE_URL?.trim();
  if (!baseUrl) throw new ZaloOtpServiceError("NOT_CONFIGURED");

  try {
    return new URL(path, `${baseUrl.replace(/\/$/, "")}/`).toString();
  } catch {
    throw new ZaloOtpServiceError("NOT_CONFIGURED");
  }
}

function getTimeoutMs() {
  const configured = Number(process.env.ZALO_OTP_SERVICE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

async function postToZaloOtpService(
  path: string,
  payload: Record<string, string>,
) {
  const serviceToken = process.env.ZALO_OTP_SERVICE_TOKEN?.trim();

  try {
    const response = await fetch(getServiceUrl(path), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(serviceToken
          ? { Authorization: `Bearer ${serviceToken}` }
          : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(getTimeoutMs()),
    });

    const result = (await response
      .json()
      .catch(() => ({}))) as ZaloOtpServiceResponse;

    return { response, result };
  } catch (error) {
    if (error instanceof ZaloOtpServiceError) throw error;

    console.error("[ZALO_OTP_SERVICE] Request unavailable", {
      path,
      cause: error instanceof Error ? error.name : "UnknownError",
    });
    throw new ZaloOtpServiceError("REQUEST_FAILED");
  }
}

function getRetryAfterSeconds(
  response: Response,
  result: ZaloOtpServiceResponse,
) {
  const bodyValue = Number(result.retryAfterSeconds);
  if (Number.isFinite(bodyValue) && bodyValue > 0) return bodyValue;

  const headerValue = Number(response.headers.get("retry-after"));
  return Number.isFinite(headerValue) && headerValue > 0
    ? headerValue
    : DEFAULT_RESEND_SECONDS;
}

export async function requestZaloOtp(rawPhone: string) {
  const normalizedPhone = normalizeVietnamesePhone(rawPhone);
  const { response, result } = await postToZaloOtpService(REQUEST_PATH, {
    phone: normalizedPhone,
  });

  if (!response.ok) {
    const retryAfterSeconds = getRetryAfterSeconds(response, result);
    if (response.status === 429) {
      throw new ZaloOtpServiceError(
        "RATE_LIMITED",
        retryAfterSeconds,
        response.status,
      );
    }

    console.error("[ZALO_OTP_SERVICE_REQUEST] Provider rejected request", {
      status: response.status,
      providerStatus: result.statusCode,
      providerError: result.error,
    });
    throw new ZaloOtpServiceError(
      "REQUEST_FAILED",
      undefined,
      response.status,
    );
  }

  let phone = normalizedPhone;
  if (result.phone) {
    try {
      phone = normalizeVietnamesePhone(result.phone);
    } catch {
      // The locally validated phone remains authoritative if the provider
      // returns an unexpected display format.
    }
  }

  const expiresInSeconds = Number(result.expiresInSeconds);

  return {
    phone,
    expiresInSeconds:
      Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
        ? expiresInSeconds
        : DEFAULT_EXPIRY_SECONDS,
    resendAfterSeconds: DEFAULT_RESEND_SECONDS,
  };
}

export async function verifyZaloOtp(rawPhone: string, rawOtp: string) {
  let phone: string;

  try {
    phone = normalizeVietnamesePhone(rawPhone);
  } catch {
    return null;
  }

  const otp = rawOtp.replace(/\D/g, "");
  if (!/^\d{6}$/.test(otp)) return null;

  const { response, result } = await postToZaloOtpService(VERIFY_PATH, {
    phone,
    code: otp,
  });

  if (response.ok) {
    if (!result.phone) return phone;

    try {
      return normalizeVietnamesePhone(result.phone);
    } catch {
      return phone;
    }
  }

  if (response.status === 400 || response.status === 401) {
    console.warn("[ZALO_OTP_SERVICE_VERIFY_REJECTED]", {
      status: response.status,
      providerStatus: result.statusCode,
      providerMessage: result.message,
    });
    return null;
  }

  if (response.status === 429) {
    throw new ZaloOtpServiceError(
      "RATE_LIMITED",
      getRetryAfterSeconds(response, result),
      response.status,
    );
  }

  console.error("[ZALO_OTP_SERVICE_VERIFY] Provider rejected request", {
    status: response.status,
    providerStatus: result.statusCode,
    providerError: result.error,
  });
  throw new ZaloOtpServiceError(
    "REQUEST_FAILED",
    undefined,
    response.status,
  );
}
