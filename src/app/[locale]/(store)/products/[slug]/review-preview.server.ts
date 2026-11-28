import "server-only";

import type { ReviewsResponse } from "@/components/storefront/product-reviews";

const previewOfferDurationMs = 102 * 60_000 + 18_000;

const sampleReviews = [
  { rating: 5, title: "Đúng phân loại đã chọn", body: "Mình nhận đúng loại đã chọn. Sản phẩm đúng mô tả và được đóng gói gọn gàng, kín đáo." },
  { rating: 5, title: "Dễ chọn và dễ sử dụng", body: "Thông tin các lựa chọn rõ ràng, mình tìm được loại phù hợp. Hướng dẫn sử dụng đi kèm cũng dễ hiểu." },
  { rating: 4, title: "Trải nghiệm tốt", body: "Hàng giao đầy đủ và bao bì còn nguyên. Mình muốn có thêm hình chi tiết để dễ so sánh các lựa chọn." },
];

export function createReviewPreview() {
  const now = Date.now();
  const reviews = sampleReviews.map((sample, index) => ({
    ...sample,
    id: `review-preview-${index}`,
    authorName: `Người đánh giá mẫu ${index + 1}`,
    isVerifiedPurchase: false,
    helpfulCount: 0,
    viewerFoundHelpful: false,
    createdAt: new Date(now - (index + 1) * 86_400_000).toISOString(),
  }));
  const distribution = Object.fromEntries([1, 2, 3, 4, 5].map((rating) => [
    rating,
    reviews.filter((review) => review.rating === rating).length,
  ]));
  const reviewData: ReviewsResponse = {
    reviews,
    summary: {
      total: reviews.length,
      average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length,
      distribution,
    },
    pagination: { page: 1, pageCount: 1 },
  };

  return {
    reviewData,
    sold: 4_800,
    endsAt: new Date(now + previewOfferDurationMs).toISOString(),
  };
}

export type ReviewPreview = ReturnType<typeof createReviewPreview>;
