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

const oldStandardTT = Old_Standard_TT({
  weight: ["400", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Auria Store",
  description: "Premium essentials designed for the modern lifestyle.",
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
