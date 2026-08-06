export class PhoneOtpError extends Error {
  constructor(public readonly code: "INVALID_PHONE") {
    super(code);
    this.name = "PhoneOtpError";
  }
}

export function normalizeVietnamesePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("0")
    ? `84${digits.slice(1)}`
    : digits;

  if (!/^84(?:3|5|7|8|9)\d{8}$/.test(normalized)) {
    throw new PhoneOtpError("INVALID_PHONE");
  }

  return normalized;
}

export function isValidVietnamesePhone(value: string) {
  try {
    normalizeVietnamesePhone(value);
    return true;
  } catch {
    return false;
  }
}

export function formatVietnamesePhone(phone: string) {
  return phone.startsWith("84") ? `0${phone.slice(2)}` : phone;
}
