import * as jose from "jose";

export async function getAppleClientSecret() {
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
    .setExpirationTime("180d") // Expires in 180 days (max 6 months allowed by Apple)
    .sign(ecPrivateKey);

  return secret;
}
