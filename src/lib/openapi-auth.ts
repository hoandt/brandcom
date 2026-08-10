import { createHash, timingSafeEqual } from "node:crypto";

function secureEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function authenticateOpenApi(request: Request) {
  const expectedAppKey = process.env.OPENAPI_APP_KEY;
  const expectedSecretKey = process.env.OPENAPI_SECRET_KEY;

  if (!expectedAppKey || !expectedSecretKey) {
    return { ok: false as const, status: 503, message: "OpenAPI credentials are not configured" };
  }

  const appKey = request.headers.get("x-app-key") ?? "";
  const secretKey = request.headers.get("x-secret-key") ?? "";
  if (!secureEqual(appKey, expectedAppKey) || !secureEqual(secretKey, expectedSecretKey)) {
    return { ok: false as const, status: 401, message: "Invalid API credentials" };
  }

  return { ok: true as const };
}
