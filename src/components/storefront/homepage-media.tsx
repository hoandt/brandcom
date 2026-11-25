import { getTranslations } from "next-intl/server"
import { getDynamicComponent } from "@/lib/dynamic-components"
import { logoMarqueeSchema } from "@/lib/homepage-media"
import { getHomepageVideoFeed } from "@/lib/homepage-video-feed"
import { LogoMarquee } from "./logo-marquee"
import { SocialVideoPreview } from "./social-video-preview"

export async function HomepageMedia({ locale }: { locale: string }) {
  const [logoContent, videoFeed, t] = await Promise.all([
    getDynamicComponent<unknown>("logo-marquee"),
    getHomepageVideoFeed(locale),
    getTranslations({ locale, namespace: "Homepage.media" }),
  ])
  const logos = logoMarqueeSchema.safeParse(logoContent)

  return (
    <>
      {logos.success && logos.data.items.length > 0 && (
        <LogoMarquee content={logos.data} heading={logos.data.heading || t("retailers")} />
      )}
      {videoFeed && (
        <SocialVideoPreview items={videoFeed.items} heading={videoFeed.heading} />
      )}
    </>
  )
}
