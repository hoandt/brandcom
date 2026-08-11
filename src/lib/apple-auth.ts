import * as jose from "jose";

let cachedAppleSecret: { secret: string; expiresAt: number } | null = null;

export async function getAppleClientSecret() {
  const now = Date.now();
  if (cachedAppleSecret && cachedAppleSecret.expiresAt > now) {
    return cachedAppleSecret.secret;
  }

  const teamId = process.env.APPLE_TEAM_ID;
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  const keyId = process.env.APPLE_KEY_ID;
  let privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !clientId || !keyId || !privateKey) {
    console.warn("Apple OAuth configuration is missing environment variables.");
    return "";
  }

  // Handle newlines in private key from env
  privateKey = privateKey.replace(/\\n/g, "\n");

  const algorithm = "ES256";
  const ecPrivateKey = await jose.importPKCS8(privateKey, algorithm);

  const secret = await new jose.SignJWT({})
    .setProtectedHeader({ alg: algorithm, kid: keyId })
    .setIssuedAt()
    .setIssuer(teamId)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .setExpirationTime("180d")
    .sign(ecPrivateKey);

  cachedAppleSecret = { secret, expiresAt: now + 24 * 60 * 60_000 };
  return secret;
}
