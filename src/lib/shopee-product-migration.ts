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
const itemsSourceUrl = "https://app.swifthub.net/api/shopee/getItems";

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
  const tierVariations = Array.isArray(data.tier_variation) ? data.tier_variation : [];
  if (models.length === 0) throw new Error("Shopee response contains no models");

  const rows = models.map((model, index) => {
    const row: ShopeeFlatRow = { "meta.item_id": itemId, "meta.shop_id": shopId, "meta.row_index": index };
    flatten(data.parent, "parent", row);
    flatten(model, "model", row);
    if (isRecord(model) && Array.isArray(model.price_info) && isRecord(model.price_info[0])) {
      const currentPrice = Number(model.price_info[0].current_price);
      const originalPrice = Number(model.price_info[0].original_price);
      if (Number.isFinite(currentPrice)) row["variant.current_price"] = currentPrice;
      row["variant.compare_price"] = Number.isFinite(originalPrice) && originalPrice > currentPrice ? originalPrice : null;
    }
    if (isRecord(model) && Array.isArray(model.tier_index)) {
      for (let tierPosition = 0; tierPosition < model.tier_index.length; tierPosition++) {
        const optionIndex = Number(model.tier_index[tierPosition]);
        const tier = tierVariations[tierPosition];
        if (!isRecord(tier) || !Array.isArray(tier.option_list) || !Number.isInteger(optionIndex)) continue;
        const option = tier.option_list[optionIndex];
        if (!isRecord(option)) continue;
        const optionName = typeof option.option === "string" ? option.option : "";
        if (optionName) row[`variant.option.${tierPosition}`] = optionName;
        if (!row["variant.image_url"] && isRecord(option.image) && typeof option.image.image_url === "string") {
          row["variant.image_url"] = option.image.image_url;
        }
      }
    }
    return row;
  });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  return { rows, columns, hasModels: data.has_models === true };
}

export type ShopeeItemSummary = {
  itemId: number;
  status: string;
  updateTime: number | null;
};

function itemListPayload(payload: unknown) {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.response)) return payload.response;
  if (isRecord(payload.data)) return isRecord(payload.data.response) ? payload.data.response : payload.data;
  return payload;
}

export async function fetchAllShopeeItems(shopId: number) {
  const items = new Map<number, ShopeeItemSummary>();
  let offset = 0;
  let pages = 0;
  let reportedTotal: number | null = null;

  while (pages < 50 && items.size < 5_000) {
    const response = await fetch(itemsSourceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId, offset, page_size: 100, item_status: "NORMAL" }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const raw: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = isRecord(raw) && typeof raw.error === "string" ? raw.error : `Shopee items API returned ${response.status}`;
      throw new Error(message);
    }
    const payload = itemListPayload(raw);
    if (!payload) throw new Error("Shopee items API returned an invalid payload");
    const sourceItems = Array.isArray(payload.item)
      ? payload.item
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.item_list)
          ? payload.item_list
          : [];
    for (const entry of sourceItems) {
      if (!isRecord(entry)) continue;
      const rawId = entry.item_id ?? entry.itemId;
      const itemId = typeof rawId === "number" ? rawId : Number(rawId);
      if (!Number.isSafeInteger(itemId) || itemId <= 0) continue;
      const rawUpdateTime = entry.update_time ?? entry.updateTime;
      items.set(itemId, {
        itemId,
        status: typeof (entry.item_status ?? entry.status) === "string" ? String(entry.item_status ?? entry.status) : "NORMAL",
        updateTime: Number.isFinite(Number(rawUpdateTime)) ? Number(rawUpdateTime) : null,
      });
    }
    if (Number.isFinite(Number(payload.total_count))) reportedTotal = Number(payload.total_count);
    pages += 1;
    const hasNext = payload.has_next_page === true || payload.hasNextPage === true;
    const nextOffset = Number(payload.next_offset ?? payload.nextOffset);
    if (!hasNext || sourceItems.length === 0) break;
    offset = Number.isSafeInteger(nextOffset) && nextOffset > offset ? nextOffset : offset + sourceItems.length;
  }

  return { items: [...items.values()], pages, total: reportedTotal ?? items.size, truncated: pages >= 50 || items.size >= 5_000 };
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
    productImage: findColumn(columns, ["parent.image.image_url_list.0", "model.image.image_url_list.0", "parent.image_url", "parent.image.0", "model.image_url"]),
    variantName: findColumn(columns, ["model.model_name", "model.name", "model.tier_variation_name"]),
    sku: findColumn(columns, ["model.model_sku", "model.sku", "parent.item_sku"]),
    price: findColumn(columns, ["variant.current_price", "model.price_info.0.current_price", "model.current_price", "model.price", "model.model_original_price"]),
    comparePrice: findColumn(columns, ["variant.compare_price", "model.price_info.0.original_price", "model.original_price"]),
    stock: findColumn(columns, ["model.stock_info_v2.summary_info.total_available_stock", "model.stock_info.0.current_stock", "model.stock", "model.normal_stock"]),
    variantImage: findColumn(columns, ["variant.image_url", "model.image.image_url_list.0", "model.image_url", "model.image.image_url", "model.image"]),
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
