import { prisma } from '../src/lib/prisma';

// This represents the structure returned by TikTok Shop API GET Product
const tiktokMockData = [
  {
    "id": "1729592969712207008",
    "title": "Breathable Silicone Nipple Cover - Champagne",
    "description": "<p>Ultra-thin, seamless, and reusable silicone covers in our signature champagne shade.</p>",
    "status": "APPROVED",
    "brand": {
      "id": "7082427311584347905",
      "name": "Auria"
    },
    "main_images": [
      {
        "uri": "product-image-1",
        "urls": [
          "https://placehold.co/600x750/png?text=Champagne+Cover"
        ]
      }
    ],
    "skus": [
      {
        "id": "1729582718312380123",
        "seller_sku": "AUR-NC-CHAMP-S",
        "price": {
          "sale_price": "28.00"
        },
        "inventory": [
          {
            "quantity": 150
          }
        ]
      },
      {
        "id": "1729582718312380124",
        "seller_sku": "AUR-NC-CHAMP-M",
        "price": {
          "sale_price": "28.00"
        },
        "inventory": [
          {
            "quantity": 100
          }
        ]
      }
    ]
  },
  {
    "id": "1729592969712207009",
    "title": "Premium Silk Sleep Mask",
    "description": "<p>100% pure mulberry silk sleep mask for ultimate comfort and skin protection.</p>",
    "status": "APPROVED",
    "brand": {
      "id": "7082427311584347905",
      "name": "Auria"
    },
    "main_images": [
      {
        "uri": "product-image-2",
        "urls": [
          "https://placehold.co/600x750/png?text=Silk+Mask"
        ]
      }
    ],
    "skus": [
      {
        "id": "1729582718312380125",
        "seller_sku": "AUR-SM-SILK-OS",
        "price": {
          "sale_price": "45.00"
        },
        "inventory": [
          {
            "quantity": 250
          }
        ]
      }
    ]
  },
  {
    "id": "1729592969712207010",
    "title": "Seamless Essential Bralette",
    "description": "<p>Wire-free, buttery soft bralette designed for all-day wear and invisible layering.</p>",
    "status": "APPROVED",
    "brand": {
      "id": "7082427311584347905",
      "name": "Auria"
    },
    "main_images": [
      {
        "uri": "product-image-3",
        "urls": [
          "https://placehold.co/600x750/png?text=Seamless+Bralette"
        ]
      }
    ],
    "skus": [
      {
        "id": "1729582718312380126",
        "seller_sku": "AUR-BR-BLK-S",
        "price": {
          "sale_price": "38.00"
        },
        "inventory": [
          {
            "quantity": 75
          }
        ]
      },
      {
        "id": "1729582718312380127",
        "seller_sku": "AUR-BR-BLK-M",
        "price": {
          "sale_price": "38.00"
        },
        "inventory": [
          {
            "quantity": 120
          }
        ]
      },
      {
        "id": "1729582718312380128",
        "seller_sku": "AUR-BR-BLK-L",
        "price": {
          "sale_price": "38.00"
        },
        "inventory": [
          {
            "quantity": 40
          }
        ]
      }
    ]
  }
];

async function main() {
  console.log("Start seeding...");

  // Clear existing products to prevent duplicates during multiple seeds
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  const accCategory = await prisma.category.create({
    data: { name: "Accessories", slug: "accessories", description: "Everyday essentials." },
  });
  const intimatesCategory = await prisma.category.create({
    data: { name: "Intimates", slug: "intimates", description: "Seamless and comfortable." },
  });

  for (const tkProduct of tiktokMockData) {
    // We map the TikTok 'title' to Prisma 'name' and create a slug from it
    const slug = tkProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const createdProduct = await prisma.product.create({
      data: {
        name: tkProduct.title,
        slug: slug,
        description: tkProduct.description,
        status: "ACTIVE", // Mapped from "APPROVED"
        images: {
          create: tkProduct.main_images.map((img, idx) => ({
            url: img.urls[0],
            alt: tkProduct.title,
            position: idx,
          })),
        },
        variants: {
          create: tkProduct.skus.map((sku, idx) => ({
            sku: sku.seller_sku,
            name: `Variant ${idx + 1}`, // Simplified for dummy data
            price: parseFloat(sku.price.sale_price),
            stock: sku.inventory[0]?.quantity || 0,
            isActive: true,
          })),
        },
        categories: {
          connect: [
            { id: tkProduct.title.includes("Cover") || tkProduct.title.includes("Mask") ? accCategory.id : intimatesCategory.id }
          ]
        },
      },
    });

    console.log(`Created product with id: ${createdProduct.id}`);
  }

  console.log("Seeding finished.");

  // Clear existing coupons
  await prisma.coupon.deleteMany();

  // Create test coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: "SAVE10",
        type: "PERCENTAGE",
        value: 10, // 10% off
        minOrderValue: 50,
      },
      {
        code: "FREESHIP",
        type: "FREE_SHIPPING",
        value: 0,
        minOrderValue: 100,
      },
      {
        code: "MINUS5",
        type: "FIXED",
        value: 5, // $5 off
        minOrderValue: 0,
      }
    ],
  });

  console.log("Coupons seeded successfully.");

  // Seed sample about page
  await prisma.page.deleteMany({ where: { slug: "about" } });
  await prisma.page.create({
    data: {
      slug: "about",
      title: {
        en: "About Auria",
        vi: "Về Auria",
        th: "เกี่ยวกับ Auria",
      },
      content: [
        {
          id: "sec-1",
          layout: "1-col",
          columns: [
            {
              span: 12,
              content: {
                en: "At **AURIA**, we empower confidence and comfort with innovative, high-quality solutions. Founded to address gaps in the fashion and undergarment industry, our mission is to become the world's leading provider of premium nipple covers and undergarments.",
                vi: "Tại **AURIA**, chúng tôi tôn vinh sự tự tin và thoải mái bằng các giải pháp sáng tạo, chất lượng cao. Được thành lập nhằm giải quyết các khoảng trống trong ngành thời trang và nội y, sứ mệnh của chúng tôi là trở thành nhà cung cấp miếng dán ngực và nội y cao cấp hàng đầu thế giới.",
                th: "ที่ **AURIA** เราส่งเสริมความมั่นใจและความสะดวกสบายด้วยโซลูชั่นที่สร้างสรรค์และมีคุณภาพสูง ก่อตั้งขึ้นเพื่อแก้ปัญหากลุ่มสินค้าแฟชั่นและชุดชั้นใน ภารกิจของเราคือการเป็นผู้ให้บริการแผ่นแปะหน้าอกและชุดชั้นในระดับพรีเมียมชั้นนำของโลก",
              }
            }
          ]
        },
        {
          id: "sec-2",
          layout: "2-col-equal",
          columns: [
            {
              span: 6,
              content: {
                en: "![Auria Brand Philosophy](https://placehold.co/800x600/e3c8c8/701a23?text=AURIA+Philosophy)",
                vi: "![Triết lý thương hiệu Auria](https://placehold.co/800x600/e3c8c8/701a23?text=AURIA+Philosophy)",
                th: "![ปรัชญาแบรนด์ Auria](https://placehold.co/800x600/e3c8c8/701a23?text=AURIA+Philosophy)",
              }
            },
            {
              span: 6,
              content: {
                en: "Our mission is simple: to redefine essentials with products that make you feel secure, confident, and comfortable. By combining innovative materials with thoughtful design, we create solutions that seamlessly integrate into your wardrobe.\n\nEvery product is crafted using dermatologist-tested, medical-grade materials, ensuring a gentle touch on your skin and ultimate durability.",
                vi: "Sứ mệnh của chúng tôi rất đơn giản: định nghĩa lại các sản phẩm thiết yếu giúp bạn cảm thấy an toàn, tự tin và thoải mái. Bằng cách kết hợp các vật liệu sáng tạo với thiết kế chu đáo, chúng tôi tạo ra các giải pháp tích hợp liền mạch vào tủ quần áo của bạn.\n\nMỗi sản phẩm đều được chế tác bằng các vật liệu y tế đã qua kiểm nghiệm da liễu, đảm bảo độ dịu nhẹ cho da và độ bền tối đa.",
                th: "ภารกิจของเรานั้นง่ายมาก: เพื่อกำหนดนิยามใหม่ของสิ่งจำเป็นด้วยผลิตภัณฑ์ที่ทำให้คุณรู้สึกปลอดภัย มั่นใจ และสะดวกสบาย ด้วยการผสมผสานวัสดุที่เป็นนวัตกรรมเข้ากับการออกแบบที่คิดมาอย่างดี เราจึงสร้างโซลูชันที่ผสานเข้ากับตู้เสื้อผ้าของคุณได้อย่างราบรื่น\n\nทุกผลิตภัณฑ์สร้างสรรค์ขึ้นโดยใช้วัสดุเกรดทางการแพทย์ที่ผ่านการทดสอบโดยแพทย์ผิวหนัง เพื่อให้มั่นใจว่าสัมผัสที่อ่อนโยนต่อผิวของคุณและมีความทนทานสูงสุด",
              }
            }
          ]
        }
      ] as any,
      isActive: true,
    },
  });

  console.log("Pages seeded successfully.");
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
