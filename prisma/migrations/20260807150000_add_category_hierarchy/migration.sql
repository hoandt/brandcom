ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Category" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Category_parentId_position_idx" ON "Category"("parentId", "position");

ALTER TABLE "Category"
ADD CONSTRAINT "Category_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductReview"
ADD CONSTRAINT "ProductReview_rating_check"
CHECK ("rating" BETWEEN 1 AND 5);
