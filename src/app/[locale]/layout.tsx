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
import { getDynamicComponent } from "@/lib/dynamic-components";

const oldStandardTT = Old_Standard_TT({
  weight: ["400", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-heading",
});

import { getStoreSettings } from "@/lib/store-settings";

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const title = settings.seoTitle || settings.storeName || brandConfig.name;
  const description = settings.seoDescription || settings.tagline || brandConfig.tagline;

  return {
    metadataBase: new URL(brandConfig.siteUrl),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description: description,
    applicationName: title,
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  const messages = await getMessages();
  
  const theme = await getDynamicComponent("theme-settings");
  const themeSettings = (theme as any) || {};
  
  const primaryColor = themeSettings.primaryColor || "#e11d48";
  const secondaryColor = themeSettings.secondaryColor;
  const typographyColor = themeSettings.typographyColor;
  const headingColor = themeSettings.headingColor;
  const radius = themeSettings.radius || "1rem";
  const fontSans = themeSettings.fontSans && themeSettings.fontSans !== "TikTok Sans" 
    ? `"${themeSettings.fontSans}", sans-serif`
    : undefined;
  const fontHeading = themeSettings.fontHeading && themeSettings.fontHeading !== "Old Standard TT"
    ? `"${themeSettings.fontHeading}", serif`
    : undefined;

  const dynamicStyles = {
    "--primary": primaryColor,
    ...(secondaryColor && { "--secondary": secondaryColor }),
    ...(typographyColor && { "--foreground": typographyColor }),
    ...(headingColor && { "--heading-color": headingColor }),
    "--radius": radius,
    ...(fontSans && { "--font-sans": fontSans }),
    ...(fontHeading && { "--font-heading": fontHeading }),
  } as React.CSSProperties;

  const customFonts = [];
  if (themeSettings.fontSans && themeSettings.fontSans !== "TikTok Sans") {
    customFonts.push(themeSettings.fontSans.replace(/ /g, "+"));
  }
  if (themeSettings.fontHeading && themeSettings.fontHeading !== "Old Standard TT") {
    customFonts.push(themeSettings.fontHeading.replace(/ /g, "+"));
  }
  
  // Only unique fonts
  const uniqueFonts = Array.from(new Set(customFonts));
  const googleFontsUrl = uniqueFonts.length > 0 
    ? `https://fonts.googleapis.com/css2?family=${uniqueFonts.join("&family=")}:wght@300;400;500;600;700&display=swap`
    : null;

  return (
    <html lang={locale}>
      <head>
        {googleFontsUrl && <link href={googleFontsUrl} rel="stylesheet" />}
      </head>
      <body className={`antialiased ${oldStandardTT.variable}`} style={dynamicStyles}>
        <Suspense fallback={null}>
          <MarketingPixels
            gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
            tiktokPixelId={process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "D9BFPIBC77U102660TPG"}
          />
        </Suspense>
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
