"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"

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

  if (!session?.user?.email) {
    return { error: "Not authenticated" }
  }

  const userEmail = session.user.email
  const t = await getTranslations("Account")

  const name = formData.get("name") as string
  const phone = formData.get("phone") as string
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmNewPassword = formData.get("confirmNewPassword") as string
  const locale = formData.get("locale") as string || "en"

  const user = await prisma.user.findUnique({
    where: { email: userEmail }
  })

  if (!user) {
    return { error: "User not found" }
  }

  const dataToUpdate: any = {}
  if (name) dataToUpdate.name = name
  if (phone) dataToUpdate.phone = phone

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
      where: { email: userEmail },
      data: dataToUpdate
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
