type ExplorerPhoto = {
  src: string
  alt: string
  position?: string
}

export type ExplorerCollection = {
  slug: string
  label: string
  cta: string
  campaign: ExplorerPhoto
  detail: ExplorerPhoto
  products?: {
    categorySlug: string
    slugs?: string[]
  }
}

export const explorerCollections: readonly [ExplorerCollection, ...ExplorerCollection[]] = [
  {
    slug: "all",
    label: "Shop All",
    cta: "Shop All",
    campaign: {
      src: "/banners/auriabare-vertical.jpg",
      alt: "Bốn người mẫu trong campaign Auria Bare trên nền hồng, một người cầm hộp miếng dán",
      position: "50% 36%",
    },
    detail: {
      src: "/banners/auria-nipple-cover.jpg",
      alt: "Người mẫu mặc bodysuit trắng cầm hộp Auria Bare trong tay",
    },
  },
  {
    slug: "adhesive-bras",
    label: "Adhesive Bras",
    cta: "Shop Adhesive Bras",
    campaign: {
      src: "/banners/collection-explorer/adhesive-bras-campaign.webp",
      alt: "Người mẫu mặc áo dán ngực giọt nước màu nude với quần jeans",
      position: "50% 38%",
    },
    detail: {
      src: "/banners/collection-explorer/adhesive-bras-detail.webp",
      alt: "Cận cảnh cúp áo dán giọt nước và dây nâng được cầm trên tay",
    },
    products: { categorySlug: "ao-dan" },
  },
  {
    slug: "bra-inserts",
    label: "Bra Inserts",
    cta: "Shop Bra Inserts",
    campaign: {
      src: "/banners/collection-explorer/bra-inserts-campaign.webp",
      alt: "Người mẫu mặc cúp dán có độn dưới áo cổ đổ màu kem",
      position: "50% 42%",
    },
    detail: {
      src: "/banners/collection-explorer/bra-inserts-detail.webp",
      alt: "Bàn tay cầm nghiêng cúp dán độn để thấy độ dày của cúp",
    },
    products: {
      categorySlug: "ao-dan",
      slugs: [
        "ao-dan-tron-su-don-2cm",
        "ao-dan-tron-su-don-5cm",
        "ao-dan-xoai-su-don-2-cm",
      ],
    },
  },
  {
    slug: "nipple-covers",
    label: "Nipple Covers",
    cta: "Shop Nipple Covers",
    campaign: {
      src: "/banners/auria-nipple-cover.jpg",
      alt: "Người mẫu mặc bodysuit trắng cầm hộp miếng dán ngực silicone Auria Bare trước nền hồng",
      position: "50% 58%",
    },
    detail: {
      src: "/banners/collection-explorer/nipple-covers-detail.webp",
      alt: "Cận cảnh miếng dán nhũ hoa silicone tròn có lỗ thông hơi được cầm trên tay",
    },
    products: {
      categorySlug: "mieng-dan-nguc",
      slugs: [
        "combo-2-mieng-dan-nhu-hoa-tron-10cm",
        "mieng-dan-giot-nuoc-tron",
        "mieng-dan-keo-bo-tron",
        "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay",
        "mieng-dan-keo-tai-tho",
        "mieng-dan-keo-tai-tho-cao-cap",
        "mieng-dan-keo-tam-giac",
        "mieng-dan-nhu-hoa-nhiet-tu-than",
        "mieng-dan-nhu-hoa-thong-hoi",
        "mieng-dan-nhu-hoa-thong-hoi-loc-xoay",
        "mieng-dan-nhu-hoa-tron",
      ],
    },
  },
]
