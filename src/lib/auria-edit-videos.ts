export type AuriaEditVideo = {
  slug: string;
  productSlug: string;
  relatedProduct?: boolean;
};

export const auriaEditVideos: AuriaEditVideo[] = [
  { slug: "can-canh-mieng-dan-keo-giot-nuoc-thong-hoi", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay" },
  { slug: "vong-lo-thong-hoi-mieng-dan-loc-xoay", productSlug: "mieng-dan-nhu-hoa-thong-hoi-loc-xoay" },
  { slug: "phoi-mieng-dan-giot-nuoc-tron-voi-ao-om", productSlug: "mieng-dan-giot-nuoc-tron" },
  { slug: "thu-mieng-dan-nhu-hoa-tron-auria", productSlug: "mieng-dan-nhu-hoa-tron" },
  { slug: "phoi-mieng-dan-tron-thong-hoi-voi-ao-trang", productSlug: "mieng-dan-nhu-hoa-thong-hoi-loc-xoay" },
  { slug: "mo-hop-mieng-dan-giot-nuoc-tron-auria", productSlug: "mieng-dan-giot-nuoc-tron" },
  { slug: "phoi-mieng-dan-keo-giot-nuoc-voi-ao-hai-day", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay" },
  { slug: "cap-mieng-dan-keo-giot-nuoc-thong-hoi", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay" },
  { slug: "can-canh-cap-mieng-dan-giot-nuoc", productSlug: "mieng-dan-giot-nuoc-tron", relatedProduct: true },
  { slug: "minh-hoa-cach-dan-mieng-giot-nuoc-thong-hoi", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay" },
  { slug: "thu-do-bam-mieng-dan-keo-giot-nuoc", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay" },
  { slug: "xem-vien-mieng-dan-keo-giot-nuoc-thong-hoi", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay" },
  { slug: "mo-hop-mieng-dan-thong-hoi-auria", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay", relatedProduct: true },
  { slug: "can-canh-mieng-dan-silicone-thong-hoi-mau-kem", productSlug: "mieng-dan-nhu-hoa-thong-hoi-loc-xoay", relatedProduct: true },
  { slug: "mo-hop-mieng-dan-silicone-auria-voi-ao-trang", productSlug: "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay", relatedProduct: true },
  { slug: "mo-hop-mieng-dan-nhu-hoa-dang-tron", productSlug: "mieng-dan-nhu-hoa-tron" },
  { slug: "trai-nghiem-ao-dan-silicone-co-don", productSlug: "ao-dan-don-3cm", relatedProduct: true },
];

export const auriaEditVideoDirectory = "/videos/auria-edit";
