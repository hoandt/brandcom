"use client"

import { useRef } from "react"

type OtpCodeInputProps = {
  value: string
  onChange: (value: string) => void
  label: string
  invalid?: boolean
  disabled?: boolean
}

const OTP_LENGTH = 6

export function OtpCodeInput({
  value,
  onChange,
  label,
  invalid = false,
  disabled = false,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from(
    { length: OTP_LENGTH },
    (_, index) => value[index] || "",
  )

  const focusInput = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus()
  }

  const applyCode = (rawValue: string) => {
    const nextValue = rawValue.replace(/\D/g, "").slice(0, OTP_LENGTH)
    onChange(nextValue)
    focusInput(Math.min(nextValue.length, OTP_LENGTH - 1))
  }

  const updateDigit = (index: number, rawValue: string) => {
    const numericValue = rawValue.replace(/\D/g, "")

    if (numericValue.length > 1) {
      applyCode(numericValue)
      return
    }

    const nextDigits = [...digits]
    nextDigits[index] = numericValue
    onChange(nextDigits.join(""))

    if (numericValue && index < OTP_LENGTH - 1) {
      focusInput(index + 1)
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-6 gap-2"
      onPaste={(event) => {
        event.preventDefault()
        applyCode(event.clipboardData.getData("text"))
      }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element
          }}
          value={digit}
          onChange={(event) => updateDigit(index, event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault()
              const nextDigits = [...digits]

              if (nextDigits[index]) {
                nextDigits[index] = ""
                onChange(nextDigits.join(""))
                return
              }

              if (index > 0) {
                nextDigits[index - 1] = ""
                onChange(nextDigits.join(""))
                focusInput(index - 1)
              }
            }

            if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault()
              focusInput(index - 1)
            }

            if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
              event.preventDefault()
              focusInput(index + 1)
            }
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          enterKeyHint={index === OTP_LENGTH - 1 ? "done" : "next"}
          maxLength={OTP_LENGTH}
          disabled={disabled}
          aria-label={`${label} ${index + 1}`}
          aria-invalid={invalid}
          autoFocus={index === 0}
          className={`h-14 min-w-0 border bg-background text-center text-xl font-black tabular-nums outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 ${invalid ? "border-destructive" : "border-input"}`}
        />
      ))}
    </div>
  )
}
