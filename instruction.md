# Single-Store E-commerce Website with Next.js 15

Building a single-store e-commerce website such as `brand.com` is very achievable with Next.js 15.

---

## Recommended Technology Stack

```text
Frontend:        Next.js 15 + TypeScript
UI:              Tailwind CSS + shadcn/ui
Database:        PostgreSQL or MySQL
ORM:             Prisma
Authentication:  Auth.js
Image Storage:   AWS S3 or Cloudflare R2
Payment:         COD, PayOS, VNPay or MoMo
Fulfillment:     SwiftHub API
Deployment:      Vercel or Docker + AWS
```

---

## Main Storefront Pages

```text
/
├── /collections/[slug]
├── /products/[slug]
├── /search
├── /cart
├── /checkout
├── /order-success
├── /track-order
├── /account
└── /admin
```

### Customer-facing features

* Homepage
* Product listing
* Product detail pages
* Product variants
* Collections and categories
* Search
* Shopping cart
* Checkout
* COD and online payment
* Voucher codes
* Order confirmation
* Order tracking
* Customer account
* Mobile-responsive design
* SEO optimization

---

## Admin Dashboard

The first version should include:

* Product management
* Product variant management
* Category and collection management
* Inventory management
* Order management
* Customer management
* Discount and voucher management
* Homepage banner management
* Shipping configuration
* Store settings
* Basic sales reports

---

## SwiftHub Integration

Since SwiftHub already manages orders, inventory and fulfillment, the website can send orders directly to SwiftHub.

```text
Customer places an order
        ↓
Website validates the order
        ↓
Website saves the order
        ↓
Payment or COD is confirmed
        ↓
Order is sent to SwiftHub
        ↓
SwiftHub allocates inventory
        ↓
Warehouse packs and ships
        ↓
Tracking status syncs back to the website
```

SwiftHub can remain the main system for:

* Inventory
* Order allocation
* Warehouse operations
* Shipping labels
* Fulfillment status
* Tracking numbers
* Delivery status

---

## Suggested Project Structure

```text
src/
├── app/
│   ├── (store)/
│   │   ├── page.tsx
│   │   ├── products/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── collections/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   ├── checkout/
│   │   │   └── page.tsx
│   │   ├── order-success/
│   │   │   └── page.tsx
│   │   └── track-order/
│   │       └── page.tsx
│   │
│   ├── admin/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── discounts/
│   │   ├── collections/
│   │   └── settings/
│   │
│   └── api/
│       ├── checkout/
│       │   └── route.ts
│       ├── payments/
│       │   └── webhook/
│       │       └── route.ts
│       └── swifthub/
│           └── webhook/
│               └── route.ts
│
├── components/
│   ├── storefront/
│   ├── admin/
│   ├── cart/
│   └── ui/
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── cart.ts
│   ├── payment.ts
│   └── swifthub.ts
│
├── stores/
│   └── cart-store.ts
│
└── types/
    ├── product.ts
    ├── order.ts
    └── cart.ts
```

---

## Basic Database Models

```prisma
model Product {
  id          String           @id @default(cuid())
  name        String
  slug        String           @unique
  description String?
  status      ProductStatus    @default(DRAFT)
  images      ProductImage[]
  variants    ProductVariant[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model ProductImage {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  url       String
  alt       String?
  position  Int      @default(0)
}

model ProductVariant {
  id           String   @id @default(cuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id])

  sku          String   @unique
  name         String
  price        Decimal
  comparePrice Decimal?
  stock        Int      @default(0)
  isActive     Boolean  @default(true)
}

model Order {
  id            String      @id @default(cuid())
  orderNumber   String      @unique
  customerName  String
  customerPhone String
  customerEmail String?
  address       String
  subtotal      Decimal
  shippingFee   Decimal
  discount      Decimal     @default(0)
  totalAmount   Decimal
  paymentMethod String
  paymentStatus String
  orderStatus   String
  trackingCode  String?
  swifthubId    String?
  items         OrderItem[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model OrderItem {
  id          String @id @default(cuid())
  orderId     String
  order       Order  @relation(fields: [orderId], references: [id])

  variantId   String
  sku         String
  productName String
  variantName String?
  price       Decimal
  quantity    Int
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}
```

---

## Cart Management

Zustand can be used to manage the shopping cart on the client.

```ts
export type CartItem = {
  variantId: string;
  productName: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
};
```

The cart can be persisted in `localStorage`.

However, during checkout, the server must validate:

* Product availability
* Product price
* Variant status
* Inventory quantity
* Voucher validity
* Shipping fee
* Final total

Never trust product prices or totals submitted directly by the browser.

---

## Checkout Flow

```text
1. Customer reviews the cart
2. Customer enters contact information
3. Customer enters delivery address
4. Server validates product prices and inventory
5. Server calculates discounts and shipping fees
6. Customer selects COD or online payment
7. Website creates the order
8. Website sends the order to SwiftHub
9. Customer receives the order confirmation
```

For online payments:

```text
Create pending order
        ↓
Redirect customer to payment gateway
        ↓
Payment gateway sends webhook
        ↓
Verify webhook signature
        ↓
Update payment status
        ↓
Send confirmed order to SwiftHub
```

---

## SEO

Next.js is suitable for product SEO because product pages can be rendered on the server.

```ts
import type { Metadata } from "next";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return {
    title: product.seoTitle ?? product.name,
    description:
      product.seoDescription ?? product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images.map((image) => image.url),
    },
  };
}
```

The website should also include:

* `sitemap.xml`
* `robots.txt`
* Canonical URLs
* Product JSON-LD
* Breadcrumb JSON-LD
* Open Graph metadata
* Optimized product images
* Mobile-friendly pages
* Clean URLs

---

## Product Caching

Product pages can use server-side caching and revalidation.

```ts
const product = await fetch(
  `${process.env.API_URL}/products/${slug}`,
  {
    next: {
      revalidate: 60,
      tags: [`product-${slug}`],
    },
  },
);
```

After updating a product from the admin dashboard:

```ts
"use server";

import { revalidateTag } from "next/cache";

export async function updateProduct(
  slug: string,
  input: ProductInput,
) {
  await saveProduct(input);

  revalidateTag(`product-${slug}`);
  revalidateTag("product-list");
}
```

---

## Security Requirements

The website should include:

* Server-side checkout validation
* Admin route protection
* Role-based authorization
* Payment webhook signature verification
* API rate limiting
* CSRF protection where required
* Secure HTTP-only cookies
* Input validation using Zod
* Audit logs for important admin changes
* Inventory validation before confirming orders
* Idempotency protection for payment webhooks
* Idempotency protection when sending orders to SwiftHub

---

## Recommended MVP Roadmap

### Phase 1: Basic Storefront

* Homepage
* Product catalog
* Product detail pages
* Product variants
* Cart
* COD checkout
* Responsive design
* Basic admin dashboard

### Phase 2: SwiftHub Integration

* Send orders to SwiftHub
* Sync inventory
* Sync fulfillment status
* Sync tracking numbers
* Order tracking page

### Phase 3: Payments and Marketing

* PayOS, VNPay or MoMo
* Voucher codes
* Customer accounts
* Product reviews
* Facebook Pixel
* TikTok Pixel
* Google Analytics
* Abandoned-cart tracking

### Phase 4: Advanced Commerce

* Affiliate attribution
* KOC referral codes
* Upsell and cross-sell
* Product bundles
* Loyalty points
* Automated email campaigns
* Revenue and profit dashboard
* COD reconciliation

---

## Recommended Direction

The best approach is to build a custom single-brand storefront where:

* Next.js handles the storefront and admin dashboard
* PostgreSQL or MySQL stores website data
* SwiftHub handles inventory, orders and fulfillment
* PayOS, VNPay or MoMo handles online payments
* AWS S3 or Cloudflare R2 stores product images

This gives the brand full control over:

* User experience
* Customer data
* SEO
* Product presentation
* Marketing pixels
* Checkout flow
* Fulfillment integration
* Affiliate tracking

The project should begin as a focused custom e-commerce website rather than trying to recreate every Shopify feature.

---

## Development Progress (Recent Updates)

### 1. Internationalization (i18n)
- Implemented `next-intl` for multi-language support (English, Vietnamese, Thai).
- Set Vietnamese (`vi`) as the default locale via `src/middleware.ts` and `src/i18n/request.ts`.
- Created a `LanguageSwitcher` component in the Navbar to handle locale changes gracefully.

### 2. UI & Design System (ThirdLove "Champagne" Theme)
- Adopted a mobile-first, clean, premium aesthetic inspired by ThirdLove.
- Migrated global styles (`globals.css`) to a high-contrast minimalist palette with blush pink accents (`#f1aa97`, `#fef4f3`).
- Set global border-radius (`--radius`) to `0` for sharp-edged modern components.
- Integrated `Jost` (sans) and `Space Grotesk` (heading) via Google Fonts.
- Redesigned core UI components (`Button`, `Input`) to feature uppercase typography, wide letter spacing (`tracking-widest`), and sharp corners.
- Redesigned the `Navbar` and `StorefrontPage` (Hero, Product Grid) to reflect the sleek, airy editorial vibe.

### 3. Checkout & Order Placement
- Integrated `@tanstack/react-query` with a global `Providers` wrapper in `layout.tsx`.
- Created a responsive Checkout Page (`/checkout`) using `react-hook-form` and `zod` for robust client-side validation.
- Built a secure backend API (`POST /api/checkout`) utilizing `zod` schema parsing and `prisma.$transaction` to simultaneously save `Order` and `OrderItem` records.
- Set up a mock cart item workflow to allow immediate end-to-end testing of the checkout process.
