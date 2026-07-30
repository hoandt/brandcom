"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ isTransparent }: { isTransparent?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLanguage = (newLocale: string) => {
    if (newLocale === locale) return;

    // Replace the current locale prefix with the new one
    // We match /en, /vi, or /th at the start of the pathname
    const newPathname = pathname.replace(/^\/(en|vi|th)/, `/${newLocale}`);
    router.push(newPathname);
    router.refresh(); // Refresh to ensure server components update properly
  };

  const languages = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "English" },
    { code: "th", name: "ไทย" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Switch language" className={isTransparent ? "text-white hover:text-white hover:bg-white/20" : ""} />}
      >
        <Globe className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={locale === lang.code ? "bg-accent text-accent-foreground" : ""}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
