import type { Metadata } from "next";
import { Old_Standard_TT } from "next/font/google";
import "@fontsource/tiktok-sans/300.css";
import "@fontsource/tiktok-sans/400.css";
import "@fontsource/tiktok-sans/500.css";
import "@fontsource/tiktok-sans/700.css";
import "../globals.css";
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import Providers from "@/components/providers";
import NextTopLoader from 'nextjs-toploader';
import { Suspense } from "react";
import { MarketingPixels } from "@/components/analytics/marketing-pixels";
import { brandConfig } from "@/lib/brand-config";

const oldStandardTT = Old_Standard_TT({
  weight: ["400", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  metadataBase: new URL(brandConfig.siteUrl),
  title: {
    default: brandConfig.name,
    template: `%s | ${brandConfig.name}`,
  },
  description: brandConfig.tagline,
  applicationName: brandConfig.name,
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`antialiased ${oldStandardTT.variable}`}>
        <Suspense fallback={null}>
          <MarketingPixels
            gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
            tiktokPixelId={process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "D9BFPIBC77U102660TPG"}
          />
        </Suspense>
        <NextTopLoader color="hsl(var(--primary))" showSpinner={false} />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
