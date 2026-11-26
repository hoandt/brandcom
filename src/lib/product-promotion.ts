import { z } from "zod";

export const PRODUCT_PROMOTION_CODE = "product-promotion";
export const PRODUCT_PROMOTION_NAME = "Product Page Promotions";

const text = (max: number) => z.string().trim().max(max);
const line = (max: number) => text(max).min(1);
const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  stickyBar: z.boolean().optional(),
  cartDrawer: z.boolean().optional(),
  bundleUpgrade: z.boolean().optional(),
  defaultVariant: z.enum(["first", "best-value"]).optional(),
  lowStockThreshold: z.number().int().min(0).max(100).optional(),
  announcement: text(180).optional(),
  flashVoucherCode: text(80).optional(),
  expressShipping: z.object({
    cutoff: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a cutoff time in HH:mm format."),
    area: line(80),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  }).nullable().optional(),
  liveViewers: z.boolean().optional(),
  purchaseToast: z.boolean().optional(),
  intro: text(500).optional(),
  benefits: z.array(text(80)).transform((lines) => lines.filter(Boolean)).pipe(z.array(z.string()).max(6)).optional(),
  trustLabels: z.array(text(80)).transform((lines) => lines.filter(Boolean)).pipe(z.array(z.string()).max(3)).optional(),
  returnPolicy: text(1000).optional(),
  comparison: z.object({
    title: line(150),
    rows: z.array(z.object({
      label: line(80),
      auria: line(240),
      alternative: line(240),
    })).min(1).max(8),
  }).nullable().optional(),
}).strict();

export const productPromotionSchema = z.object({
  defaults: settingsSchema,
  products: z.array(z.object({
    slug: z.string().trim().min(1).max(180).regex(/^[\p{L}\p{N}_-]+$/u, "Enter the product slug from its URL."),
    settings: settingsSchema,
  }).strict()).max(500),
}).strict().superRefine(({ products }, ctx) => {
  const seen = new Set<string>();
  products.forEach(({ slug }, index) => {
    if (seen.has(slug)) ctx.addIssue({
      code: "custom",
      path: ["products", index, "slug"],
      message: "This product already has an override.",
    });
    seen.add(slug);
  });
});

export type PromotionSettings = z.infer<typeof settingsSchema>;
export type ProductPromotionConfig = z.infer<typeof productPromotionSchema>;
export type ProductPromotion = PromotionSettings & {
  enabled: boolean;
  stickyBar: boolean;
  cartDrawer: boolean;
  bundleUpgrade: boolean;
  defaultVariant: "first" | "best-value";
};

export const defaultProductPromotion: ProductPromotionConfig = {
  defaults: {
    enabled: true,
    stickyBar: true,
    cartDrawer: true,
    bundleUpgrade: true,
    defaultVariant: "first",
    trustLabels: ["Hỗ trợ sau mua"],
  },
  products: [{
    slug: "mieng-dan-nhu-hoa-tron",
    settings: {
      defaultVariant: "best-value",
      lowStockThreshold: 10,
      announcement: "So sánh giá từng combo miếng dán tròn",
      intro: "Mỏng nhẹ dưới áo ôm, bám chắc khi vận động và êm dịu trên da.",
      benefits: ["Viền siêu mỏng", "100% silicone", "Kháng nước & mồ hôi"],
      trustLabels: ["Keo sinh học", "Đổi lỗi 7 ngày", "Hỗ trợ sau mua"],
      returnPolicy: "Hỗ trợ đổi trả trong 7 ngày với sản phẩm lỗi, giao sai hoặc thiếu hàng. Sản phẩm cần còn nguyên vẹn và chưa qua sử dụng.\nVui lòng quay video mở hàng có mã vận đơn để Auria hỗ trợ nhanh nhất.",
      comparison: {
        title: "Chọn miếng dán phù hợp với trang phục của bạn",
        rows: [
          { label: "Phần viền", auria: "Mép viền siêu mỏng, hạn chế hằn dưới áo ôm", alternative: "Kiểm tra độ dày của viền nếu bạn hay mặc vải mỏng." },
          { label: "Chất liệu", auria: "100% silicone, keo sinh học", alternative: "Xem thông tin chất liệu và loại keo trước khi mua." },
          { label: "Độ bám", auria: "Kháng nước và mồ hôi", alternative: "Kiểm tra khả năng kháng nước và mồ hôi của từng mẫu." },
          { label: "Dùng lại", auria: "Có thể tái sử dụng khi vệ sinh đúng cách", alternative: "Xem hướng dẫn vệ sinh và tái sử dụng của từng mẫu." },
        ],
      },
    },
  }],
};

export function resolveProductPromotion(config: ProductPromotionConfig, slug: string): ProductPromotion {
  return {
    enabled: true,
    stickyBar: true,
    cartDrawer: true,
    bundleUpgrade: true,
    defaultVariant: "first",
    ...config.defaults,
    ...config.products.find((product) => product.slug === slug)?.settings,
  };
}

export function validateProductPromotion(content: unknown) {
  const result = productPromotionSchema.safeParse(content);
  if (result.success) return { content: result.data };

  const issue = result.error.issues[0];
  return { error: `${issue.path.join(".") || "content"} — ${issue.message}` };
}
