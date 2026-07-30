import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is supported
  const locales = ['en', 'vi', 'th'];
  if (!locale || !locales.includes(locale)) {
    locale = 'vi';
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
