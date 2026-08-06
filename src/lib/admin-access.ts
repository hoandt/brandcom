export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const configured = process.env.ADMIN_EMAILS || "sph.auria@gmail.com";
  return configured.split(",").some((candidate) => candidate.trim().toLowerCase() === email.toLowerCase());
}
