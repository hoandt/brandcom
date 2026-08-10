ALTER TABLE "StoreSettings"
ADD COLUMN "orderNotificationEmails" JSONB NOT NULL DEFAULT '[]'::JSONB;

UPDATE "StoreSettings"
SET "orderNotificationEmails" = jsonb_build_array("orderNotificationEmail")
WHERE "orderNotificationEmail" IS NOT NULL
  AND "orderNotificationEmail" <> '';
