export type ShopeeFlatRow = Record<string, string | number | boolean | null>;

export type ShopeeProductMappings = {
  productName: string;
  description: string;
  overview: string;
  materials: string;
  care: string;
  productImage: string;
  variantName: string;
  sku: string;
  price: string;
  comparePrice: string;
  stock: string;
  variantImage: string;
};

const sourceUrl = "https://app.swifthub.net/api/shopee/getModels";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flatten(value: unknown, prefix: string, output: ShopeeFlatRow) {
  if (value === null || value === undefined) {
    if (prefix) output[prefix] = null;
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0 && prefix) output[prefix] = null;
    value.forEach((entry, index) => flatten(entry, `${prefix}.${index}`, output));
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, entry]) => flatten(entry, prefix ? `${prefix}.${key}` : key, output));
    return;
  }
  if (prefix && ["string", "number", "boolean"].includes(typeof value)) {
    output[prefix] = value as string | number | boolean;
  }
}

export async function fetchShopeeModels(itemId: number, shopId: number) {
  const response = await fetch(sourceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: itemId, shopId }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : `Shopee API returned ${response.status}`;
    throw new Error(message);
  }
  if (!isRecord(payload)) throw new Error("Shopee API returned an invalid payload");
  const data = isRecord(payload.data) && ("model" in payload.data || "parent" in payload.data) ? payload.data : payload;
  const models = Array.isArray(data.model) ? data.model : data.model ? [data.model] : [];
  if (models.length === 0) throw new Error("Shopee response contains no models");

  const rows = models.map((model, index) => {
    const row: ShopeeFlatRow = { "meta.item_id": itemId, "meta.shop_id": shopId, "meta.row_index": index };
    flatten(data.parent, "parent", row);
    flatten(model, "model", row);
    return row;
  });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  return { rows, columns, hasModels: data.has_models === true };
}

function findColumn(columns: string[], candidates: string[]) {
  const normalized = new Map(columns.map((column) => [column.toLowerCase(), column]));
  for (const candidate of candidates) {
    const exact = normalized.get(candidate.toLowerCase());
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const suffix = columns.find((column) => column.toLowerCase().endsWith(candidate.toLowerCase()));
    if (suffix) return suffix;
  }
  return "";
}

export function suggestShopeeMappings(columns: string[]): ShopeeProductMappings {
  return {
    productName: findColumn(columns, ["parent.item_name", "parent.name", "model.item_name", "model.name"]),
    description: findColumn(columns, ["parent.description", "parent.description_info.extended_description", "model.description"]),
    overview: "",
    materials: "",
    care: "",
    productImage: findColumn(columns, ["parent.image.image_url_list.0", "parent.image_url", "parent.image.0", "model.image_url"]),
    variantName: findColumn(columns, ["model.model_name", "model.name", "model.tier_variation_name"]),
    sku: findColumn(columns, ["model.model_sku", "model.sku", "parent.item_sku"]),
    price: findColumn(columns, ["model.price_info.0.current_price", "model.current_price", "model.price", "model.model_original_price"]),
    comparePrice: findColumn(columns, ["model.price_info.0.original_price", "model.original_price"]),
    stock: findColumn(columns, ["model.stock_info_v2.summary_info.total_available_stock", "model.stock_info.0.current_stock", "model.stock", "model.normal_stock"]),
    variantImage: findColumn(columns, ["model.image_url", "model.image.image_url", "model.image"]),
  };
}

export function mappedValue(row: ShopeeFlatRow, column: string) {
  return column ? row[column] : null;
}

export function mappedText(row: ShopeeFlatRow, column: string) {
  const value = mappedValue(row, column);
  return value === null || value === undefined ? "" : String(value).trim();
}

export function mappedNumber(row: ShopeeFlatRow, column: string, fallback = 0) {
  const value = mappedValue(row, column);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
