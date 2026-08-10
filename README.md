This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Zalo phone OTP service

Vietnamese checkout authenticates customers through a server-side OTP service. Configure these values only in the server environment; never expose them through `NEXT_PUBLIC_*` variables.

```env
AUTH_URL=https://your-domain.example
AUTH_TRUST_HOST=true
AUTH_SECRET=replace-with-a-strong-random-secret
FRONTEND_URL=https://your-domain.example

ZALO_OTP_SERVICE_URL=https://dev-zippy.up.railway.app
ZALO_OTP_SERVICE_TIMEOUT_MS=15000
# Optional when the OTP service requires bearer authentication:
ZALO_OTP_SERVICE_TOKEN=

# Defaults shown: three OTP sends per client IP every five minutes.
ZALO_OTP_SEND_IP_LIMIT=3
ZALO_OTP_SEND_IP_WINDOW_SECONDS=300
```

The browser calls this application only. OTP request and verification are proxied server-to-server through `ZALO_OTP_SERVICE_URL`. Keep `AUTH_SECRET` stable across deployments. The OTP service itself must require `ZALO_OTP_SERVICE_TOKEN` (or enforce an equivalent private-network policy); this application's rate limit cannot protect a publicly callable upstream URL from direct requests. Ensure the production reverse proxy overwrites `CF-Connecting-IP`, `X-Vercel-Forwarded-For`, `X-Real-IP`, or `X-Forwarded-For` with the trusted client IP.

After changing the Prisma schema, synchronize the database and regenerate the client before building:

```bash
npx prisma db push
npx prisma generate
```

## Server-to-server OpenAPI

Full integration documentation: [`docs/openapi-orders.md`](docs/openapi-orders.md). A reusable maintenance brief is available at [`.agents/openapi-orders-agent.md`](.agents/openapi-orders-agent.md).

Configure two server-only credentials. Do not prefix these variables with `NEXT_PUBLIC_`:

```env
OPENAPI_APP_KEY=replace-with-an-app-key
OPENAPI_SECRET_KEY=replace-with-a-long-random-secret
```

Interactive Swagger documentation is available at `GET /api/openapi/docs`, and the OpenAPI 3.1 JSON document is available at `GET /api/openapi`. The API supports `POST /api/openapi/orders` and `POST /api/openapi/products`. Create an order with:

```bash
curl -X POST http://localhost:3000/api/openapi/orders \
  -H 'Content-Type: application/json' \
  -H 'X-App-Key: replace-with-an-app-key' \
  -H 'X-Secret-Key: replace-with-a-long-random-secret' \
  -d '{
    "orderNumber": "EXTERNAL-10001",
    "customer": {
      "name": "Nguyen Van A",
      "phone": "0900000000",
      "email": "customer@example.com",
      "address": "Ho Chi Minh City"
    },
    "paymentMethod": "COD",
    "shippingFee": 30000,
    "discount": 0,
    "items": [{ "sku": "YOUR-SKU", "quantity": 1 }]
  }'
```

Orders are priced from the current variant price unless `unitPrice` is supplied. Inventory allocation and order creation run in one serializable transaction. Reusing an `orderNumber` returns HTTP `409` instead of creating a duplicate.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
### New-order email notifications

Orders created through storefront checkout or the OpenAPI order endpoint send a simple admin email. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Set `ORDER_NOTIFICATION_EMAIL` to choose the recipient; it falls back to `SMTP_USER`. `SMTP_PREFER_IPV4=true` forces IPv4 for hosts that have unreliable IPv6 SMTP connectivity. Notification failures are logged and do not fail a completed order.
