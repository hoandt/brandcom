ALTER TABLE "StoreSettings"
ADD COLUMN "orderNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "orderNotificationEmail" TEXT;
