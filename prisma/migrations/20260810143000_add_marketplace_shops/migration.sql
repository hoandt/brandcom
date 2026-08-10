ALTER TABLE "StoreSettings"
ADD COLUMN "marketplaceShops" JSONB NOT NULL DEFAULT '[]'::JSONB;

UPDATE "StoreSettings"
SET "marketplaceShops" = jsonb_build_array(
  jsonb_build_object('marketplace', 'shopee', 'shopId', "marketplaceShopId")
)
WHERE "marketplaceShopId" IS NOT NULL
  AND "marketplaceShopId" <> ''
  AND "marketplaceShops" = '[]'::JSONB;
