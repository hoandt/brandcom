"use client";

import Script from "next/script";

type GoogleAnalyticsProps = {
  gtmId?: string;
};

export function GoogleAnalytics({ gtmId = "GTM-TVTCWVGP" }: GoogleAnalyticsProps) {
  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        `}
      </Script>
    </>
  );
}
