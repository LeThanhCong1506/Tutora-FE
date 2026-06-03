'use client';

/**
 * FaqSection — Client Component.
 *
 * Chỉ phần accordion (useState cho openIndex) cần client. Data tĩnh truyền từ
 * Server parent (TestimonialsSection) xuống qua prop — cho phép Server render
 * ra HTML sẵn (SEO-friendly) rồi client hydrate interactivity.
 */

import { useState } from 'react';

export type Faq = {
  question: string;
  answer: string;
  tag: string;
};

type Props = {
  faqs: Faq[];
};

export default function FaqSection({ faqs }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="faq-list">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={faq.question} className={`faq-item${isOpen ? ' open' : ''}`}>
            <button type="button" className="faq-question" onClick={() => toggle(index)}>
              <div className="faq-question-left">
                <span className="faq-tag">{faq.tag}</span>
                <span className="faq-question-text">{faq.question}</span>
              </div>
              <svg className="faq-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="faq-answer">
              <p className="faq-answer-text">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
