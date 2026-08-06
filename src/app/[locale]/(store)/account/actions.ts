"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import type { Prisma } from "@/generated/prisma/client"

export type AccountFormState = {
  success?: boolean
  error?: string
  message?: string
}

export async function updateAccount(
  prevState: AccountFormState | undefined,
  formData: FormData
): Promise<AccountFormState> {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  const userId = session.user.id
  const t = await getTranslations("Account")

  const name = formData.get("name") as string
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmNewPassword = formData.get("confirmNewPassword") as string
  const locale = formData.get("locale") as string || "en"

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    return { error: "User not found" }
  }

  const dataToUpdate: Prisma.UserUpdateInput = {}
  if (name) dataToUpdate.name = name

  if (newPassword) {
    if (newPassword !== confirmNewPassword) {
      return { error: t("passwordsDoNotMatch") }
    }

    if (user.password) {
      if (!currentPassword) {
        return { error: t("incorrectCurrentPassword") }
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
        return { error: t("incorrectCurrentPassword") }
      }
    }

    dataToUpdate.password = await bcrypt.hash(newPassword, 10)
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    })

    revalidatePath(`/${locale}/account`)
    if (newPassword) {
      return { success: true, message: t("passwordUpdated") }
    }
    return { success: true }
  } catch (err) {
    console.error(err)
    return { error: "Something went wrong" }
  }
}
