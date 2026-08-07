import { prisma } from "../src/lib/prisma";

const pageId = "cms8ga4ix000h1cit3w2vh2gl";

const vi = {
  hero: `### Mềm mại để là chính mình

AURIA tin rằng sự tự tin bắt đầu từ cảm giác thoải mái bên trong. Chúng tôi tạo nên những món đồ lót liền mạch, nhẹ nhàng ôm theo cơ thể — để bạn được tự do chuyển động, tự do lựa chọn và tự do là chính mình mỗi ngày.`,
  origin: `## Câu chuyện của AURIA

AURIA bắt đầu từ một câu hỏi rất giản dị: **vì sao đồ lót đẹp lại thường khiến phụ nữ phải đánh đổi sự thoải mái?**

Chúng tôi đi tìm một cách tiếp cận khác — nơi phom dáng nâng niu đường cong tự nhiên, chất liệu mềm thoáng phù hợp với nhịp sống hiện đại, và từng chi tiết đều có lý do để tồn tại.

Không chạy theo những chuẩn mực áp đặt, AURIA thiết kế để đồng hành cùng cơ thể thật của phụ nữ Việt Nam.`,
  belief: `> “Thoải mái không phải là điều xa xỉ. Đó là nền tảng để bạn tự tin sống theo cách của mình.”

### Đẹp theo cách tự nhiên

Không gọng cứng, không đường may nặng nề, không những chi tiết thừa. Chỉ còn lại cảm giác vừa vặn, tinh tế và gần như không hiện diện dưới trang phục.`,
  comfort: `### Êm ái suốt ngày dài

Chất liệu được chọn vì độ mềm, khả năng co giãn và cảm giác dễ chịu trên da — từ buổi sáng bận rộn đến những phút nghỉ ngơi cuối ngày.`,
  fit: `### Tôn trọng mọi đường cong

Thiết kế linh hoạt theo chuyển động của cơ thể, giúp nâng đỡ vừa đủ mà không ép bạn vào một khuôn mẫu duy nhất.`,
  intention: `### Tinh giản có chủ đích

Mỗi đường cắt, sắc màu và chi tiết đều được cân nhắc để dễ mặc, dễ phối và bền bỉ trong tủ đồ hằng ngày.`,
  process: `## Từ chất liệu đến cảm giác

Chúng tôi đánh giá sản phẩm không chỉ bằng vẻ ngoài, mà bằng cảm giác sau nhiều giờ mặc.

- **Mềm trên da:** ưu tiên bề mặt mịn và thoáng.
- **Chuyển động tự nhiên:** độ co giãn theo cơ thể, không cản trở.
- **Phom dáng tinh tế:** nâng đỡ nhẹ nhàng, hạn chế đường hằn.
- **Dễ đồng hành:** thiết kế tối giản cho nhiều trang phục và khoảnh khắc.`,
  promise: `## Lời hứa từ AURIA

Chúng tôi không thiết kế để thay đổi cơ thể bạn. Chúng tôi thiết kế để bạn cảm thấy dễ chịu hơn trong chính cơ thể mình.

**Thoải mái hơn. Tự tin hơn. Là bạn, trọn vẹn hơn.**

[Khám phá bộ sưu tập](/vi/collections/all)`,
};

const localized = (content: string) => ({ vi: content, en: "", th: "" });
const content = [
  { id: "about-hero", layout: "1-col", columns: [{ span: 12, content: localized(vi.hero) }] },
  { id: "about-origin", layout: "2-col-equal", columns: [{ span: 6, content: localized(vi.origin) }, { span: 6, content: localized(vi.belief) }] },
  { id: "about-values", layout: "3-col", columns: [{ span: 4, content: localized(vi.comfort) }, { span: 4, content: localized(vi.fit) }, { span: 4, content: localized(vi.intention) }] },
  { id: "about-process", layout: "2-col-split-right", columns: [{ span: 8, content: localized(vi.process) }, { span: 4, content: localized(vi.promise) }] },
];

async function main() {
  const existing = await prisma.page.findUnique({ where: { id: pageId }, select: { id: true } });
  if (!existing) throw new Error(`CMS page ${pageId} was not found`);
  const page = await prisma.page.update({
    where: { id: pageId },
    data: {
      slug: "about-us",
      title: { vi: "Câu chuyện AURIA", en: "Our Story", th: "เรื่องราวของ AURIA" },
      content,
      isActive: true,
    },
    select: { id: true, slug: true, isActive: true },
  });
  console.log(`Updated ${page.id}: /pages/${page.slug} (published: ${page.isActive})`);
}

main().finally(() => prisma.$disconnect());
