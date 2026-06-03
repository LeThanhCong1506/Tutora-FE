'use client';

import { useState } from 'react';
import type { FeedbackItem } from '@/services/tutorDetail.types';
import { StarIcon, QuoteIcon } from './icons';

/**
 * TestimonialsSection — Phase 4 MVP simplified.
 *
 * Khác Vite:
 *  - KHÔNG fetch thêm feedback từ `/api/feedback/...` (Vite gọi `getTutorFeedbacks`
 *    + `getTutorFeedbackStats`).
 *  - Chỉ navigate prev/next qua `feedbacks` đã có sẵn từ server profile fetch.
 *  - Khi có yêu cầu load thêm feedback hoặc rating histogram, port full sau.
 *
 * Vì sao MVP đơn giản: trang detail SEO-critical, server đã render feedback đầu tiên
 * vào HTML → Google index được. Pagination feedback không cần SSR (UX, không SEO).
 */

interface TestimonialsSectionProps {
  feedbacks: FeedbackItem[] | null;
  totalFeedbacks: number;
}

export default function TestimonialsSection({ feedbacks, totalFeedbacks }: TestimonialsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const list = feedbacks || [];
  const testimonial = list[currentIndex];
  const total = Math.max(totalFeedbacks, list.length);

  const handleNext = () => {
    if (currentIndex < list.length - 1) setCurrentIndex((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  };

  return (
    <section className="section5">
      <div className="heading-24">
        <h2 className="nht-k-thnh">Nhật ký thành công</h2>
      </div>

      <div className="container84">
        {testimonial ? (
          <div className="component-8" style={{ width: '100%' }}>
            <div className="container85">
              <div className="component-122">
                <QuoteIcon />
              </div>
            </div>
            <div className="container86">
              <div className="container87">
                <div className="container88">
                  <div className="background7">
                    <b className="l">{(testimonial.fromUserName || 'P').charAt(0)}</b>
                  </div>
                  <div className="container89">
                    <div className="heading-47">
                      <b className="l-minh-anh">{testimonial.fromUserName || 'Học viên'}</b>
                    </div>
                    <div className="container90">
                      <span className="hc-sinh-year">
                        {testimonial.createdAt
                          ? new Date(testimonial.createdAt).toLocaleDateString('vi-VN')
                          : 'Học viên'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="container91">
                  <i className="chuyn-mn-ca">&quot;{testimonial.comment || 'Không có bình luận.'}&quot;</i>
                </div>
                <div className="container92">
                  <div className="border2">
                    <b className="xc-thc-bi">Xác thực bởi TUTORA LMS</b>
                  </div>
                  {testimonial.courseDuration && (
                    <div className="border2">
                      <b className="xc-thc-bi">Học trong {testimonial.courseDuration}</b>
                    </div>
                  )}
                </div>
              </div>
              <div className="background8">
                <div className="container93">
                  <span className="mc-tiu-ban">Mục tiêu ban đầu</span>
                  <div className="container95">
                    <b className="thi-y">{testimonial.initialGoal || '—'}</b>
                  </div>
                </div>
                <div className="horizontal-divider3"></div>
                <div className="container96">
                  <span className="mc-tiu-ban">Kết quả thực tế</span>
                  <div className="container98">
                    <b className="t-a-biology">{testimonial.actualResult || '—'}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p
            className="empty-message-center"
            style={{
              width: '100%',
              textAlign: 'center',
              padding: '40px',
              color: 'rgba(62, 47, 40, 0.5)',
              fontStyle: 'italic',
            }}
          >
            Gia sư chưa có đánh giá nào.
          </p>
        )}

        {list.length > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginTop: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '1px solid #e4ded5',
                  background: currentIndex === 0 ? '#f5f5f5' : '#fff',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '18px', color: '#3e2f28' }}>←</span>
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= list.length - 1}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '1px solid #e4ded5',
                  background: currentIndex >= list.length - 1 ? '#f5f5f5' : '#fff',
                  cursor: currentIndex >= list.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '18px', color: '#3e2f28' }}>→</span>
              </button>
            </div>

            <div style={{ fontSize: '14px', color: '#999', fontWeight: 500 }}>
              Đánh giá {currentIndex + 1} / {total}
            </div>
          </div>
        )}

        {/* Show 5-star icons for first feedback as a hint of overall rating in SSR */}
        {testimonial && testimonial.rating != null && (
          <div className="hidden-rating" aria-hidden style={{ display: 'none' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <StarIcon key={i} filled={i <= Math.round(testimonial.rating || 0)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
