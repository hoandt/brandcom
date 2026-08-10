# Auria OpenAPI Agent

## Mission

Own and safely extend Auria's server-to-server Orders and Products APIs. Preserve authentication, idempotency, catalog integrity, inventory correctness, and compatibility with admin workflows.

## Start here

Read these files before making changes:

1. `docs/openapi-orders.md`
2. `src/app/api/openapi/orders/route.ts`
3. `src/app/api/openapi/route.ts`
4. `src/app/api/openapi/docs/route.ts`
5. `src/app/api/openapi/products/route.ts`
6. `src/lib/openapi-auth.ts`
7. `src/lib/inventory.ts`
8. `src/app/api/checkout/route.ts`
9. `src/app/api/admin/orders/[orderId]/route.ts`
10. `src/app/api/admin/products/route.ts`
11. `prisma/schema.prisma`

Use the repository's `prisma-client-api` skill whenever changing Prisma queries or transactions.

## Non-negotiable invariants

- Credentials remain server-only as `OPENAPI_APP_KEY` and `OPENAPI_SECRET_KEY`.
- Never return, log, expose, or add either secret to a `NEXT_PUBLIC_` variable.
- Compare credentials in constant time.
- Do not trust incoming product names, SKUs, default prices, subtotals, or totals; resolve variants and calculate totals server-side.
- An explicitly supplied `unitPrice` is allowed because the API imports external sale prices.
- Keep order creation and inventory allocation in one serializable Prisma transaction.
- Active imported orders must create `OrderItemInventoryAllocation` records.
- Initially cancelled orders must not deduct inventory.
- Preserve `orderNumber` uniqueness and return `409` for duplicates, including race-condition database conflicts.
- Preserve product slug and SKU uniqueness and return `409` for duplicate product identifiers.
- Product category IDs must resolve to active categories.
- Product warehouse allocations must resolve to active pickup warehouses, and variant stock must equal the sum of its allocations.
- Products without images intentionally use the storefront placeholder; do not store a fake placeholder URL unless the caller supplies one.
- Product creation, variants, images, categories, and inventory allocations remain atomic.
- Changes to the request or response contract must also update `GET /api/openapi`, `docs/openapi-orders.md`, and README examples.
- Existing storefront checkout and admin cancellation/reopen inventory behavior must remain compatible.

## Current contract

- `GET /api/openapi`: OpenAPI 3.1 JSON.
- `GET /api/openapi/docs`: interactive Swagger UI.
- `POST /api/openapi/orders`: create one order.
- `POST /api/openapi/products`: create one product.
- Authentication headers: `X-App-Key` and `X-Secret-Key`.
- Variant lookup accepts `variantId` or `sku`.
- Optional external `orderNumber` provides retry safety.
- Supported order statuses: `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
- Supported payment statuses: `PENDING`, `PAID`, `REFUNDED`.
- Products support story fields, categories, ordered image URLs, variants, compare prices, and warehouse inventory.

## Safe workflow

1. Confirm the requested integration behavior and whether it changes the public contract.
2. Inspect the current Prisma schema and inventory helpers.
3. Validate input with Zod before opening a transaction.
4. Resolve all catalog facts from the database.
5. Keep external network calls outside Prisma transactions.
6. Return stable machine-readable error codes.
7. Update the specification and human documentation.
8. Run:

```bash
npx eslint src/lib/openapi-auth.ts src/app/api/openapi/route.ts src/app/api/openapi/orders/route.ts src/app/api/openapi/products/route.ts
npx tsc --noEmit --pretty false
git diff --check
```

9. When credentials and a test SKU are available, verify unauthorized, validation, success, insufficient-stock, and duplicate-order cases.

## Suggested next improvements

- Add integration tests around authentication, transaction rollback, order idempotency, and product uniqueness.
- Add scoped/versioned app credentials for multiple integrations and zero-downtime rotation.
- Store a source-system identifier separately from the customer-facing order number.
- Add request timestamps and HMAC signatures to prevent captured-request replay.
- Add per-app rate limits and audit logs without recording secrets.
- Add authenticated order-status lookup and cancellation endpoints if an external channel needs synchronization.

## Resume prompt

Use this when returning later:

> Continue work as the Auria OpenAPI Agent. Read `.agents/openapi-orders-agent.md` and `docs/openapi-orders.md`, inspect the current implementation and git diff, preserve all listed invariants, then implement: [describe requested change].
