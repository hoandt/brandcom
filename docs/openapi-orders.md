# Auria OpenAPI

The API lets an approved server create orders and products in Auria. Created records appear in the corresponding admin screens and use the same inventory model as the admin and storefront workflows.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/openapi` | OpenAPI 3.1 JSON document |
| `GET` | `/api/openapi/docs` | Interactive Swagger UI |
| `POST` | `/api/openapi/orders` | Create an order |
| `POST` | `/api/openapi/products` | Create a product |

Open `/api/openapi/docs`, select **Authorize**, and enter both `X-App-Key` and `X-Secret-Key` to test requests. Swagger does not persist the credentials in browser storage.

The interactive application page is not an API endpoint. Created orders can be reviewed at `/vi/admin/orders`.

## Create a product

Use `POST /api/openapi/products` to create the same core product data available at `/vi/admin/products/new`.

```bash
curl -X POST https://your-domain.example/api/openapi/products \
  -H 'Content-Type: application/json' \
  -H 'X-App-Key: your-app-key' \
  -H 'X-Secret-Key: your-secret-key' \
  -d '{
    "name": "Auria New Product",
    "slug": "auria-new-product",
    "status": "DRAFT",
    "description": "Main product introduction",
    "overview": "- Lightweight\n- Comfortable fit",
    "materials": "Premium fabric",
    "care": "Hand wash cold",
    "categoryIds": [],
    "images": [],
    "variants": [
      {
        "name": "Default",
        "sku": "AURIA-NEW-DEFAULT",
        "price": 120000,
        "stock": 0,
        "isActive": true
      }
    ]
  }'
```

Product behavior:

- `name` and at least one variant are required.
- The slug is generated from the name when omitted.
- Slugs and SKUs must be unique; conflicts return `409 DUPLICATE_PRODUCT`.
- `categoryIds` must reference active categories.
- Images are URL-based. Leave `images` empty to use Auria's storefront placeholder.
- `inventories` can allocate each variant across active pickup warehouses.
- When `inventories` is omitted and `stock` is positive, stock is assigned to the default active pickup warehouse.
- Explicit inventory allocations take precedence over the legacy `stock` field.
- Product, variants, images, category connections, and inventory records are created transactionally.

The success response includes `imagesUsePlaceholder: true` when the product has no images. Created products can be reviewed at `/vi/admin/products`.

## Authentication

Every order request requires two server-only headers:

```http
X-App-Key: your-app-key
X-Secret-Key: your-secret-key
```

Configure the matching values on the Auria server:

```env
OPENAPI_APP_KEY=your-app-key
OPENAPI_SECRET_KEY=your-long-random-secret
```

Generate strong values, for example:

```bash
openssl rand -hex 24
openssl rand -hex 32
```

Never expose these values in browser JavaScript, commit them to Git, or prefix them with `NEXT_PUBLIC_`. Send requests over HTTPS in production. Restart the application after changing credentials.

## Create an order

```http
POST /api/openapi/orders
Content-Type: application/json
X-App-Key: your-app-key
X-Secret-Key: your-secret-key
```

### Request body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `orderNumber` | string | No | Unique external identifier. Recommended for idempotency. Letters, numbers, `_`, and `-` only. |
| `customer.name` | string | Yes | Customer name. |
| `customer.phone` | string | Yes | Customer phone number. |
| `customer.email` | string | No | Valid email address or an empty string. |
| `customer.address` | string | Yes | Complete delivery address. |
| `paymentMethod` | string | Yes | For example `COD`, `BANK_TRANSFER`, or the external provider name. |
| `paymentStatus` | enum | No | `PENDING`, `PAID`, or `REFUNDED`. Defaults to `PENDING`. |
| `orderStatus` | enum | No | `PROCESSING`, `SHIPPED`, `DELIVERED`, or `CANCELLED`. Defaults to `PROCESSING`. |
| `shippingFee` | number | No | Non-negative amount in the store currency. Defaults to `0`. |
| `discount` | number | No | Non-negative order discount. Capped at subtotal plus shipping. Defaults to `0`. |
| `items` | array | Yes | Between 1 and 100 unique variants. |
| `items[].variantId` | string | Conditional | Required when `sku` is omitted. |
| `items[].sku` | string | Conditional | Required when `variantId` is omitted. |
| `items[].quantity` | integer | Yes | From 1 to 10,000. |
| `items[].unitPrice` | number | No | Imported sale price. The current active variant price is used when omitted. |

Do not send both separate entries for the same variant. The API rejects duplicate items instead of silently merging them.

### Example request

```bash
curl -X POST https://your-domain.example/api/openapi/orders \
  -H 'Content-Type: application/json' \
  -H 'X-App-Key: your-app-key' \
  -H 'X-Secret-Key: your-secret-key' \
  -d '{
    "orderNumber": "TIKTOK-10001",
    "customer": {
      "name": "Nguyen Van A",
      "phone": "0900000000",
      "email": "customer@example.com",
      "address": "123 Nguyen Hue, District 1, Ho Chi Minh City"
    },
    "paymentMethod": "COD",
    "paymentStatus": "PENDING",
    "orderStatus": "PROCESSING",
    "shippingFee": 30000,
    "discount": 10000,
    "items": [
      { "sku": "AURIA-BLUE-M", "quantity": 2, "unitPrice": 120000 }
    ]
  }'
```

### Success response

```json
{
  "success": true,
  "order": {
    "id": "cm...",
    "orderNumber": "TIKTOK-10001",
    "orderStatus": "PROCESSING",
    "paymentStatus": "PENDING",
    "subtotal": 240000,
    "shippingFee": 30000,
    "discount": 10000,
    "totalAmount": 260000,
    "currency": "VND",
    "createdAt": "2026-08-10T03:00:00.000Z"
  }
}
```

## Idempotency and retries

Always provide a stable `orderNumber` from the source system. If a timeout leaves the result uncertain, retry with the same number. Auria returns `409 DUPLICATE_ORDER` instead of creating a second order.

If `orderNumber` is omitted, Auria generates one, so automatic retries can create duplicates.

## Pricing and inventory

- Auria calculates `subtotal` and `totalAmount`; incoming totals are not accepted.
- The current variant price is used unless `unitPrice` is supplied.
- Active orders reserve stock across active pickup warehouses.
- Order creation, item creation, allocation records, and stock deduction run in one serializable transaction.
- A failed item or insufficient inventory rolls back the entire order.
- Orders created initially as `CANCELLED` do not deduct inventory.

## Errors

All errors use this general shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body"
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `ORDER_CREATION_FAILED` | Variant lookup, inventory, JSON, or database failure. |
| `401` | `UNAUTHORIZED` | One or both credentials are invalid. |
| `409` | `DUPLICATE_ORDER` | `orderNumber` already exists. Treat this as an idempotent conflict. |
| `422` | `VALIDATION_ERROR` | Request fields do not match the contract. |
| `503` | `NOT_CONFIGURED` | Auria is missing one or both server credentials. |

## JavaScript example

```ts
const response = await fetch("https://your-domain.example/api/openapi/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-App-Key": process.env.AURIA_APP_KEY!,
    "X-Secret-Key": process.env.AURIA_SECRET_KEY!,
  },
  body: JSON.stringify(order),
});

const result = await response.json();
if (!response.ok && response.status !== 409) {
  throw new Error(result.error?.message ?? "Auria order import failed");
}
```

## Credential rotation

The current implementation supports one active key pair. To rotate it:

1. Pause the sending integration or coordinate a maintenance window.
2. replace both server environment values;
3. redeploy or restart Auria;
4. update the sender’s secrets; and
5. submit a test order with a unique `orderNumber`.

For zero-downtime rotation, extend authentication to accept a versioned key registry before rotating production credentials.
