export function omitShippingMappings<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => omitShippingMappings(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const copy: any = { ...data };
    delete copy.shipping_mappings;
    delete copy.spx_mapping;
    delete copy.spxMapping;
    return copy as T;
  }
  return data;
}
