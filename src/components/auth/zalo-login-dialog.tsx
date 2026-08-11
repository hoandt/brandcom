"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  KeyRound,
  Loader2,
  MessageCircleMore,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";

import { signInWithZaloOtp } from "@/app/actions/zalo-auth";
import { PhonePasswordLoginForm } from "@/components/auth/phone-password-login-form";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { isValidVietnamesePhone } from "@/lib/auth/phone-otp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ZaloLoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
  showPasswordLogin?: boolean;
};

type SendOtpResponse = {
  success: boolean;
  code?: string;
  retryAfterSeconds?: number;
  data?: {
    phone: string;
    expiresInSeconds: number;
    resendAfterSeconds: number;
  };
};

class ZaloLoginError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ZaloLoginError";
  }
}

export function ZaloLoginDialog({
  open,
  onOpenChange,
  onSuccess,
  showPasswordLogin = false,
}: ZaloLoginDialogProps) {
  const t = useTranslations("ZaloLogin");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loginMode, setLoginMode] = useState<"zalo" | "password">("zalo");
  const [resendSeconds, setResendSeconds] = useState(0);
  const isPhoneValid = isValidVietnamesePhone(phone);
  const finishLogin = async () => {
    await onSuccess?.();
    onOpenChange(false);
  };

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (open) return;
    setStep("phone");
    setPhone("");
    setOtp("");
    setLoginMode("zalo");
    setResendSeconds(0);
  }, [open]);

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/zalo/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = (await response.json()) as SendOtpResponse;

      if (!response.ok || !result.success || !result.data) {
        if (result.retryAfterSeconds) {
          setResendSeconds(result.retryAfterSeconds);
        }
        throw new ZaloLoginError(result.code || "OTP_DELIVERY_UNAVAILABLE");
      }

      return result.data;
    },
    onSuccess: (data) => {
      setPhone(data.phone);
      setResendSeconds(data.resendAfterSeconds);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const result = await signInWithZaloOtp(phone, otp);

      if (!result.success) {
        throw new ZaloLoginError(result.code);
      }

      return result;
    },
    onSuccess: finishLogin,
  });

  const currentError = sendOtpMutation.error || verifyOtpMutation.error;
  const errorCode =
    currentError instanceof ZaloLoginError
      ? currentError.code
      : currentError
        ? "UNKNOWN"
        : null;
  const errorMessage = errorCode
    ? t.has(`errors.${errorCode}`)
      ? t(`errors.${errorCode}`)
      : t("errors.UNKNOWN")
    : null;

  const submitPhone = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPhoneValid) return;
    setStep("otp");
    setOtp("");
    sendOtpMutation.reset();
    verifyOtpMutation.reset();
    sendOtpMutation.mutate();
  };

  const submitOtp = (event: React.FormEvent) => {
    event.preventDefault();
    verifyOtpMutation.mutate();
  };

  const resendOtp = () => {
    if (resendSeconds > 0 || sendOtpMutation.isPending) return;
    sendOtpMutation.reset();
    sendOtpMutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[420px] gap-0 overflow-y-auto rounded-none border border-border bg-background p-0 shadow-2xl ring-0"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {loginMode === "password" ? (
            <button
              type="button"
              onClick={() => {
                setLoginMode("zalo");
                setStep("phone");
              }}
              className="flex h-9 w-9 items-center justify-center border border-border text-foreground transition-colors hover:bg-muted"
              aria-label={t("zaloAlternative")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : step === "otp" ? (
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                verifyOtpMutation.reset();
              }}
              className="flex h-9 w-9 items-center justify-center border border-border text-foreground transition-colors hover:bg-muted"
              aria-label={t("changePhone")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}

          <div className="flex items-center gap-2 text-primary">
            <MessageCircleMore className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-[0.14em]">
              {t("brand")}
            </span>
          </div>

          <DialogClose className="flex h-9 w-9 items-center justify-center border border-border text-foreground transition-colors hover:bg-muted">
            <X className="h-4 w-4" />
            <span className="sr-only">{t("close")}</span>
          </DialogClose>
        </div>

        <div className="p-5 sm:p-6">
          <DialogHeader className="mb-5 text-center">
            <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center border border-primary/20 bg-primary/[0.06] text-primary">
              {loginMode === "password" ? (
                <KeyRound className="h-5 w-5" />
              ) : step === "phone" ? (
                <Phone className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <DialogTitle className="text-xl font-bold leading-tight">
              {loginMode === "password"
                ? t("passwordAlternative")
                : step === "phone"
                  ? t("title")
                  : t("otpTitle")}
            </DialogTitle>
          </DialogHeader>

          {loginMode === "password" ? (
            <div>
              <PhonePasswordLoginForm onSuccess={finishLogin} />
              <div className="mt-4 border-t border-border pt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("zalo");
                    setStep("phone");
                  }}
                  className="text-xs font-semibold text-primary transition-colors hover:underline"
                >
                  {t("zaloAlternative")}
                </button>
              </div>
            </div>
          ) : step === "phone" ? (
            <div>
              <form onSubmit={submitPhone} className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">
                    {t("phoneLabel")}
                  </span>
                  <Input
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      sendOtpMutation.reset();
                    }}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t("phonePlaceholder")}
                    className="h-12 rounded-none text-base"
                    aria-invalid={Boolean(errorMessage)}
                    autoFocus
                  />
                </label>

                {errorMessage && (
                  <p className="border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                    {errorMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-none font-bold"
                  disabled={sendOtpMutation.isPending || !isPhoneValid}
                >
                  {sendOtpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("sending")}
                    </>
                  ) : (
                    t("sendCode")
                  )}
                </Button>
              </form>

              {showPasswordLogin && (
                <div className="mt-4 border-t border-border pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setLoginMode("password")}
                    className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary hover:underline"
                  >
                    {t("passwordAlternative")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submitOtp} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">
                  {t("otpLabel")}
                </span>
                <OtpCodeInput
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    verifyOtpMutation.reset();
                  }}
                  label={t("otpLabel")}
                  invalid={Boolean(errorMessage)}
                  disabled={
                    verifyOtpMutation.isPending ||
                    sendOtpMutation.isPending ||
                    sendOtpMutation.isError
                  }
                />
              </label>

              {sendOtpMutation.isPending && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  {t("sending")}
                </p>
              )}

              {errorMessage && (
                <p className="border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-none font-bold"
                disabled={
                  verifyOtpMutation.isPending ||
                  sendOtpMutation.isPending ||
                  sendOtpMutation.isError ||
                  otp.length !== 6
                }
              >
                {verifyOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("verifying")}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("verify")}
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={resendOtp}
                disabled={
                  (resendSeconds > 0 && !sendOtpMutation.isError) ||
                  sendOtpMutation.isPending
                }
                className="w-full py-2 text-xs font-semibold text-primary disabled:text-muted-foreground"
              >
                {sendOtpMutation.isPending
                  ? t("sending")
                  : resendSeconds > 0 && !sendOtpMutation.isError
                    ? t("resendIn", { seconds: resendSeconds })
                    : t("resend")}
              </button>
            </form>
          )}

          {loginMode === "zalo" && (
            <div className="mt-5 border-t border-border pt-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("securityNote")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
