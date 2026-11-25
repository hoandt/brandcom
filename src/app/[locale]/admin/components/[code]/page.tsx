import { isHomepageMediaType } from "@/lib/homepage-media"
import { ComponentEditorScreen } from "./component-editor"

export default async function AdminComponentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ type?: string | string[] }>
}) {
  const [{ code }, { type }] = await Promise.all([params, searchParams])
  return <ComponentEditorScreen code={code} preset={isHomepageMediaType(type) ? type : undefined} />
}
