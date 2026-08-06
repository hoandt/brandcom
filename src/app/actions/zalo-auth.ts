"use server"

import { AuthError } from "next-auth"

import { signIn } from "@/auth"

type ZaloOtpSignInResult =
  | { success: true }
  | {
      success: false
      code: "INVALID_OTP" | "OTP_VERIFICATION_UNAVAILABLE"
    }

type PhonePasswordSignInResult =
  | { success: true }
  | { success: false; code: "INVALID_CREDENTIALS" | "AUTH_UNAVAILABLE" }

export async function signInWithPhonePassword(
  phone: string,
  password: string,
): Promise<PhonePasswordSignInResult> {
  try {
    const redirectUrl = await signIn("customer-credentials", {
      phone,
      password,
      redirect: false,
      redirectTo: "/",
    })

    if (typeof redirectUrl === "string") {
      const error = new URL(redirectUrl, "http://localhost").searchParams.get(
        "error",
      )
      if (error) {
        return {
          success: false,
          code:
            error === "CredentialsSignin"
              ? "INVALID_CREDENTIALS"
              : "AUTH_UNAVAILABLE",
        }
      }
    }

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        code:
          error.type === "CredentialsSignin"
            ? "INVALID_CREDENTIALS"
            : "AUTH_UNAVAILABLE",
      }
    }

    console.error("[PHONE_PASSWORD_SIGN_IN] Unexpected failure", {
      cause: error instanceof Error ? error.name : "UnknownError",
    })
    return { success: false, code: "AUTH_UNAVAILABLE" }
  }
}

export async function signInWithZaloOtp(
  phone: string,
  otp: string,
): Promise<ZaloOtpSignInResult> {
  try {
    const redirectUrl = await signIn("zalo-otp", {
      phone,
      otp,
      redirect: false,
      redirectTo: "/",
    })

    if (typeof redirectUrl === "string") {
      const error = new URL(redirectUrl, "http://localhost").searchParams.get(
        "error",
      )

      if (error) {
        return {
          success: false,
          code:
            error === "CredentialsSignin"
              ? "INVALID_OTP"
              : "OTP_VERIFICATION_UNAVAILABLE",
        }
      }
    }

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        code:
          error.type === "CredentialsSignin"
            ? "INVALID_OTP"
            : "OTP_VERIFICATION_UNAVAILABLE",
      }
    }

    console.error("[ZALO_OTP_SIGN_IN] Unexpected failure", {
      cause: error instanceof Error ? error.name : "UnknownError",
    })
    return { success: false, code: "OTP_VERIFICATION_UNAVAILABLE" }
  }
}
