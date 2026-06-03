/**
 * TestimonialsSection — Server Component.
 *
 * Phần header (title, description) render SSR. Accordion state (`useState`) tách
 * ra `FaqSection` client island — giữ được server rendering cho data text, client
 * chỉ handle open/close.
 */

import FaqSection, { type Faq } from './FaqSection';

const FAQS: Faq[] = [
  {
    question: 'Tutora có uy tín không? Mới quá?',
    answer:
      'Tutora được đầu tư bởi Dream-lab.ai và FPT University. Chúng tôi sử dụng cơ chế giữ tiền trung gian (Escrow) — tiền của bạn chỉ được chuyển cho gia sư sau khi buổi học hoàn tất.',
    tag: 'Về độ tin cậy',
  },
  {
    question: 'Gia sư trên Tutora là ai?',
    answer:
      'Chủ yếu là sinh viên giỏi tại các trường đại học lớn và giáo viên có kinh nghiệm. Mỗi gia sư đều được xác minh hồ sơ — CMND, bằng cấp và phỏng vấn — trước khi nhận học sinh.',
    tag: 'Về gia sư',
  },
  {
    question: 'Chi phí học trên Tutora thế nào?',
    answer:
      'Giá do gia sư tự đặt. Phụ huynh chỉ trả thêm 5% phí dịch vụ cho Tutora. Không có phí ẩn, không thu trước khi buổi học diễn ra.',
    tag: 'Về chi phí',
  },
  {
    question: 'Tôi có thể theo dõi con học không?',
    answer: 'Có. Sau mỗi buổi, phụ huynh nhận báo cáo chi tiết: nội dung đã học, bài tập, và nhận xét của gia sư.',
    tag: 'Về theo dõi',
  },
  {
    question: 'Nếu không hài lòng với gia sư?',
    answer:
      'Bạn có thể đổi gia sư bất cứ lúc nào. Lịch sử học tập của con được lưu lại đầy đủ, gia sư mới tiếp tục ngay mà không cần bắt đầu lại từ đầu.',
    tag: 'Về hỗ trợ',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        {/* Header */}
        <div className="testimonials-header">
          <div className="testimonials-title-group">
            <span className="testimonials-label">Câu hỏi thường gặp</span>
            <h2 className="testimonials-title">
              PHỤ HUYNH
              <br />
              THƯỜNG HỎI GÌ?
            </h2>
          </div>
          <p className="testimonials-description">
            &ldquo;Những câu hỏi phổ biến nhất từ phụ huynh khi lần đầu tìm hiểu về Tutora.&rdquo;
          </p>
        </div>

        {/* FAQ Accordion (client island) */}
        <FaqSection faqs={FAQS} />
      </div>
    </section>
  );
}
