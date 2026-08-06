# Multilingual Architecture Guidelines

- **Multilingual By Default**: Always remember that this is a multilingual application.
- **Do Not Hardcode Text**: Whenever adding new features, UI components, or strings, do not hardcode English or Vietnamese strings directly into the UI unless instructed otherwise. 
- **Use `next-intl`**: Utilize `next-intl` (`useTranslations`, `getTranslations`, etc.) for all user-facing text. Ensure translation keys are correctly mapped and scoped.
- **Routing**: Respect the `[locale]` dynamic routing parameter when building links or pushing routes (`next/navigation`).

# Architectural Guidelines

- **Client-Side Querying by Default**: Always prefer fetching data on the client side using React Query (`useQuery` from `@tanstack/react-query`) for improved UX, instant navigation, and queries caching. The only exception is for public-facing pages where SEO is critical (like product details or collection lists), which should continue to use server-side rendering/database fetching.

# Design System Mindset

- **Compact Layouts**: Always prioritize high density and compactness. Avoid large padding (such as `p-6`, `p-8`) and wide margins. Use tighter spacing (such as `p-2.5`, `p-3`) to keep elements closer together and prevent excessive vertical scrolling, especially on mobile.
- **Sharp Corners (No Rounded Corners)**: Avoid standard `rounded-lg` or `rounded-md` classes. Prefer `rounded-none` or `rounded-sm` to keep the UI sharp, modern, and space-efficient.
- **Sized Icons & Images**: Use smaller preview images (e.g., `w-14 h-14` instead of `w-20 h-20`) and compact buttons to keep layouts dense.

# Color Discipline — No Rainbow UIs

This is a branded app with a single primary color (rose/red). Never introduce arbitrary Tailwind palette colors (e.g., `emerald`, `teal`, `amber`, `blue-*`, `cyan`, `green-*`) as accent colors for semantic states. Doing so creates a "rainbow" effect that breaks brand consistency.

**Rules:**

- **One accent color: `primary`** — All highlights, active states, icons, badges, totals, and CTAs must use `text-primary`, `bg-primary/[0.06]`, `bg-primary/10`, `border-primary`, etc.
- **No semantic color aliases** — Do not use `emerald` for "free/success", `amber` for "warning", `teal` for "shipping", or `blue` for "payment". These color associations break the brand palette.
- **Neutral for secondary states** — Use `text-muted-foreground`, `bg-muted`, `text-foreground/60` for secondary information (e.g. shipping cost label, inactive options).
- **Destructive only for errors** — `text-destructive` / `bg-destructive` is the only allowed exception to the primary-only rule, and only for actual error/validation states.
- **Gradient backgrounds** — When using gradient tints on active cards, use `from-primary/[0.06] to-primary/[0.02]`, not multi-hue gradients.

**Allowed palette** (exhaustive list):
```
primary / primary/10 / primary/[0.06] / primary/[0.02]   → brand accent
foreground / foreground/60 / foreground/80                → text hierarchy
muted / muted-foreground                                  → secondary text & backgrounds
border / border/40 / border/60                            → dividers
background / secondary/30 / secondary/60                  → page & card surfaces
destructive                                               → errors only
```

**Before writing any new UI component, ask:** "Am I using a color outside the allowed palette above?" If yes, replace it with `primary` or a `muted`/`foreground` variant.

