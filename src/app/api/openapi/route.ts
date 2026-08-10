import { NextResponse } from "next/server";

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Auria OpenAPI",
      version: "1.1.0",
      description: "Server-to-server order and product creation for Auria. Use the Authorize button to enter both required API keys.",
    },
    externalDocs: { description: "Interactive Swagger UI", url: `${origin}/api/openapi/docs` },
    servers: [{ url: origin }],
    paths: {
      "/api/openapi/orders": {
        post: {
          operationId: "createOrder",
          summary: "Create an order",
          description: "Creates an admin-visible order and allocates inventory atomically. Supply a stable orderNumber for idempotent retries.",
          security: [{ AppKey: [], SecretKey: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderRequest" } } },
          },
          responses: {
            "201": { description: "Order created" },
            "401": { description: "Invalid API credentials" },
            "409": { description: "Duplicate order number" },
            "422": { description: "Invalid request" },
          },
        },
      },
      "/api/openapi/products": {
        post: {
          operationId: "createProduct",
          summary: "Create a product",
          description: "Creates an admin-visible product with categories, image URLs, variants, and warehouse inventory. Leave images empty to use the storefront placeholder.",
          security: [{ AppKey: [], SecretKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateProductRequest" },
                examples: {
                  placeholderProduct: {
                    summary: "Product using the storefront image placeholder",
                    value: {
                      name: "Auria New Product",
                      slug: "auria-new-product",
                      status: "DRAFT",
                      description: "Main product introduction",
                      overview: "- Lightweight\n- Comfortable fit",
                      materials: "Premium fabric",
                      care: "Hand wash cold",
                      categoryIds: [],
                      images: [],
                      variants: [
                        { name: "Default", sku: "AURIA-NEW-DEFAULT", price: 120000, stock: 0, isActive: true },
                      ],
                    },
                  },
                  productWithImage: {
                    summary: "Product with a placeholder image URL and warehouse inventory",
                    value: {
                      name: "Auria Sample Product",
                      status: "ACTIVE",
                      categoryIds: [],
                      images: [{ url: "https://placehold.co/800x1000/png?text=Auria+Product", alt: "Auria sample product" }],
                      variants: [
                        { name: "Blue / M", sku: "AURIA-SAMPLE-BLUE-M", price: 120000, comparePrice: 150000, inventories: [] },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Product created" },
            "400": { description: "Category, warehouse, or database failure" },
            "401": { description: "Invalid API credentials" },
            "409": { description: "Duplicate slug or SKU" },
            "422": { description: "Invalid request" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        AppKey: { type: "apiKey", in: "header", name: "X-App-Key" },
        SecretKey: { type: "apiKey", in: "header", name: "X-Secret-Key" },
      },
      schemas: {
        CreateOrderRequest: {
          type: "object",
          required: ["customer", "paymentMethod", "items"],
          properties: {
            orderNumber: { type: "string", description: "Optional unique external order number used for idempotency" },
            customer: {
              type: "object",
              required: ["name", "phone", "address"],
              properties: {
                name: { type: "string" }, phone: { type: "string" }, email: { type: "string", format: "email" }, address: { type: "string" },
              },
            },
            paymentMethod: { type: "string", examples: ["COD"] },
            paymentStatus: { type: "string", enum: ["PENDING", "PAID", "REFUNDED"], default: "PENDING" },
            orderStatus: { type: "string", enum: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"], default: "PROCESSING" },
            shippingFee: { type: "number", minimum: 0, default: 0 },
            discount: { type: "number", minimum: 0, default: 0 },
            items: {
              type: "array", minItems: 1, maxItems: 100,
              items: {
                type: "object", required: ["quantity"],
                properties: {
                  variantId: { type: "string" }, sku: { type: "string" }, quantity: { type: "integer", minimum: 1 },
                  unitPrice: { type: "number", minimum: 0, description: "Optional imported sale price; current variant price is used when omitted" },
                },
                anyOf: [{ required: ["variantId"] }, { required: ["sku"] }],
              },
            },
          },
        },
        CreateProductRequest: {
          type: "object",
          required: ["name", "variants"],
          properties: {
            name: { type: "string", maxLength: 300, examples: ["Auria New Product"] },
            slug: { type: "string", description: "Optional URL slug; generated from name when omitted", examples: ["auria-new-product"] },
            status: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"], default: "ACTIVE" },
            description: { type: "string", default: "", examples: ["Main product introduction"] },
            overview: { type: "string", default: "", examples: ["- Lightweight\n- Comfortable fit"] },
            materials: { type: "string", default: "", examples: ["Premium fabric"] },
            care: { type: "string", default: "", examples: ["Hand wash cold"] },
            categoryIds: { type: "array", maxItems: 50, uniqueItems: true, items: { type: "string" }, default: [] },
            images: {
              type: "array", maxItems: 20, default: [],
              description: "Ordered image URLs. Leave empty to use Auria's storefront placeholder.",
              items: {
                type: "object", required: ["url"],
                properties: { url: { type: "string", format: "uri" }, alt: { type: "string" } },
              },
            },
            variants: {
              type: "array", minItems: 1, maxItems: 500,
              items: {
                type: "object", required: ["sku", "price"],
                properties: {
                  name: { type: "string", default: "Default Variant", examples: ["Blue / M"] },
                  sku: { type: "string", examples: ["AURIA-BLUE-M"] },
                  price: { type: "number", minimum: 0, examples: [120000] },
                  comparePrice: { type: ["number", "null"], minimum: 0, examples: [150000] },
                  stock: { type: "integer", minimum: 0, description: "Assigned to the default pickup warehouse when inventories is omitted", default: 0 },
                  imageUrl: { type: ["string", "null"], format: "uri" },
                  isActive: { type: "boolean", default: true },
                  inventories: {
                    type: "array", maxItems: 100,
                    items: {
                      type: "object", required: ["warehouseId", "quantity"],
                      properties: { warehouseId: { type: "string" }, quantity: { type: "integer", minimum: 0 } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}
