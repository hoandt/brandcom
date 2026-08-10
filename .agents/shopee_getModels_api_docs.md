# Shopee Item Models API Documentation

## Endpoint
`POST https://app.swifthub.net/api/shopee/getModels`

## Description
Fetches product models (variations) and parent item information for a specific Shopee item. This endpoint communicates with the Shopee API to retrieve detailed model data, stock info, and pricing.

## Request

**Headers:**
`Content-Type: application/json`

**Body Payload (JSON):**

| Field      | Type   | Required | Description                                                                 |
|------------|--------|----------|-----------------------------------------------------------------------------|
| `item_id`  | Number | Yes      | The unique identifier of the Shopee item.                                   |
| `shopId`   | Number | Yes      | The unique identifier of the shop the item belongs to.                      |
| `model_id` | Number | No       | If provided, filters the response to return only this specific model (variation). |

**Example Request:**
```json
{
  "item_id": 123456789,
  "shopId": 987654321,
  "model_id": 456789
}
```

## Response

The API returns a JSON object containing the model information. 

**Success (200 OK) Response Payload:**

| Field                        | Type    | Description                                                                                     |
|------------------------------|---------|-------------------------------------------------------------------------------------------------|
| `item_id`                    | Number  | The requested item ID.                                                                          |
| `model_id`                   | Number  | The requested model ID, if it was provided in the request.                                      |
| `has_models`                 | Boolean | `true` if the item has variations (models), `false` if it is a single-variation parent item.    |
| `tier_variation`             | Array   | Raw tier variation data from the Shopee API.                                                    |
| `standardise_tier_variation` | Array   | Standardized tier variation data from the Shopee API.                                           |
| `model`                      | Object / Array | A single model object (if `model_id` was requested), or an array of all available models. |
| `parent`                     | Object  | (Optional) Information about the parent item, included if the item has models.                  |

**Error Responses:**

- `400 Bad Request`: Returned when required fields (`item_id` or `shopId`) are missing.
  ```json
  { "error": "Missing item_id or shopId" }
  ```
- `404 Not Found`: Returned when no models or parent item information could be found for the given `item_id`.
  ```json
  { "error": "No models or parent found" }
  ```
- `500 Internal Server Error`: Returned when authentication fails (missing access token) or when the upstream Shopee API returns an error.
  ```json
  { "error": "Missing access token" } // Or the specific Shopee error message
  ```

## Usage Notes for Agents
1. **Fetching All Variations:** Send a request with only `item_id` and `shopId` to retrieve all variations for an item. The `model` field in the response will be an array.
2. **Fetching a Specific Variation:** Include a `model_id` in the request to filter the results. The `model` field in the response will be a single object matching that variation.
3. **Parent Fallback:** If an item has no variations, the endpoint will attempt to fetch and return the parent item's base information mapped as a "model" with a `model_id` of `0`.

## Auria Admin Migration

Auria exposes an admin-only migration workflow at:

`/{locale}/admin/products/migrate/shopee`

The Products page links to this workflow through **Migrate Shopee**.

### Internal routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/products/migrate/shopee/items` | Fetch all normal items for a shop, following SwiftHub pagination. |
| `POST` | `/api/admin/products/migrate/shopee/preview` | Fetch the source payload, flatten parent/model objects into columns, and suggest mappings. |
| `POST` | `/api/admin/products/migrate/shopee/import` | Re-fetch the source server-side and create the mapped Auria product. |

All routes require an authenticated Auria admin session. The upstream URL is called only by the server.

The item selector uses SwiftHub's `POST /api/shopee/getItems` route with `page_size: 100` and follows `has_next_page`/`next_offset`. Auria caps a single fetch at 50 pages or 5,000 items.

### Mapping behavior

- Each Shopee model becomes one Auria variant.
- Nested Shopee properties are flattened into dot-separated column names such as `model.price_info.0.current_price`.
- Shopee variant images are not always present on the model itself. Auria resolves `model.tier_index` against `tier_variation[].option_list[]` and exposes the result as the synthetic `variant.image_url` column.
- Auria exposes the model selling price as `variant.current_price` and suggests it as the price mapping.
- Auria exposes `variant.compare_price` only when Shopee's original price is strictly greater than its current price. Equal prices become `null` and must never produce a sale badge or struck-through price.
- The UI suggests common name, description, image, SKU, price, compare-price, stock, and variant mappings.
- Main-image and variant-image mappings include clickable source-column thumbnail galleries. Admins can still use the source-column dropdown for manual mapping.
- The mapped-row preview renders the resolved variant image and each model's individual selling/compare price.
- Admins can change every suggested source column before import.
- Missing product names, variant names, and SKUs receive deterministic fallbacks based on the Shopee item/model IDs.
- Missing images use Auria's existing storefront placeholder.
- Every imported variant stores its resolved image in `ProductVariant.imageUrl`.
- Compare price is persisted only when it is greater than the variant price, even if an admin manually maps another source column.
- Imported products default to `DRAFT` for review.
- Imported stock is assigned to the chosen pickup warehouse or the default active pickup warehouse.
- Categories, product data, variants, images, and inventory are created in one serializable transaction.
- Existing SKUs stop the import instead of updating or duplicating existing products.

### Shop settings behavior

- Marketplace shops are managed as `{ marketplace, shopId }` entries in Admin Settings.
- The migration screen fetches configured shops through `/api/admin/settings` and lists Shopee entries in its shop selector.
- Admins can add Shopee, Lazada, or TikTok Shop entries inline. Only Shopee entries can be selected as the source for this workflow.
- The legacy `marketplaceShopId` remains synchronized with the first configured Shopee shop for backward compatibility.

### Verified variant example

Item `26186528428` from Shopee shop `1257044688` demonstrates tier-based images:

- Pallet models resolve to the Pallet option image.
- Carton models resolve to the Carton option image.
- M2/M3 models resolve to the M2/M3 option image.
- Weekly and monthly models retain their respective model prices.

### Maintenance files

- `src/lib/shopee-product-migration.ts`
- `src/app/api/admin/products/migrate/shopee/preview/route.ts`
- `src/app/api/admin/products/migrate/shopee/items/route.ts`
- `src/app/api/admin/products/migrate/shopee/import/route.ts`
- `src/app/[locale]/admin/products/migrate/shopee/page.tsx`
