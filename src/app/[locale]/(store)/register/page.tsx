import { redirect } from "next/navigation"

export default async function RegisterPage(props: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await props.params
  redirect(`/${locale}/login`)
}
