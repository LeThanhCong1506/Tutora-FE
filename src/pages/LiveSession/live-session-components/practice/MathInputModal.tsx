import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import katex from 'katex';
import { KATEX_OPTIONS } from './MathText';

interface MathInputModalProps {
  /** LaTeX ban đầu (rỗng khi chèn mới). */
  initial?: string;
  onInsert: (latex: string) => void;
  onClose: () => void;
}

// Bảng màu nền TỐI, khớp phòng học (modal cũ dùng nền trắng + chữ navy nên chói).
const SURFACE = '#262626';
const TEXT = 'rgba(255,255,255,0.92)';
const MUTED = 'rgba(255,255,255,0.62)';
const LINE = 'rgba(255,255,255,0.14)';
const ACCENT = '#9d3030';
const DANGER = '#e08a8a';

/**
 * Bảng ký hiệu — bấm là chèn vào vị trí con trỏ.
 * `$1` đánh dấu chỗ đặt con trỏ sau khi chèn (thường là ô trống đầu tiên).
 */
const PALETTE: { group: string; items: { label: string; insert: string }[] }[] = [
  {
    group: 'Cơ bản',
    items: [
      { label: 'x²', insert: '^{$1}' },
      { label: 'x₁', insert: '_{$1}' },
      { label: '√', insert: '\\sqrt{$1}' },
      { label: 'ⁿ√', insert: '\\sqrt[$1]{}' },
      { label: 'a/b', insert: '\\frac{$1}{}' },
      { label: '|x|', insert: '\\left|$1\\right|' },
      { label: '( )', insert: '\\left($1\\right)' },
    ],
  },
  {
    group: 'Toán tử',
    items: [
      { label: '×', insert: '\\times ' },
      { label: '÷', insert: '\\div ' },
      { label: '±', insert: '\\pm ' },
      { label: '≠', insert: '\\neq ' },
      { label: '≤', insert: '\\leq ' },
      { label: '≥', insert: '\\geq ' },
      { label: '≈', insert: '\\approx ' },
    ],
  },
  {
    group: 'Giải tích',
    items: [
      { label: '∑', insert: '\\sum_{$1}^{}' },
      { label: '∫', insert: '\\int_{$1}^{}' },
      { label: 'lim', insert: '\\lim_{$1}' },
      { label: '∞', insert: '\\infty ' },
      { label: "f'", insert: "'" },
      { label: '→', insert: '\\to ' },
    ],
  },
  {
    group: 'Hàm & chữ Hy Lạp',
    items: [
      { label: 'sin', insert: '\\sin ' },
      { label: 'cos', insert: '\\cos ' },
      { label: 'tan', insert: '\\tan ' },
      { label: 'log', insert: '\\log_{$1}' },
      { label: 'ln', insert: '\\ln ' },
      { label: 'π', insert: '\\pi ' },
      { label: 'α', insert: '\\alpha ' },
      { label: 'β', insert: '\\beta ' },
      { label: 'Δ', insert: '\\Delta ' },
    ],
  },
];

/**
 * Modal soạn công thức Toán cho GIA SƯ.
 *
 * Gia sư phần lớn không biết LaTeX, nên bấm ký hiệu ở bảng bên dưới là chèn sẵn cú
 * pháp; khung xem trước render bằng chính KaTeX của app nên cái nhìn thấy đúng là cái
 * học sinh sẽ thấy. Sai cú pháp thì báo ngay tại chỗ thay vì để lọt vào đề.
 */
const MathInputModal = ({ initial = '', onInsert, onClose }: MathInputModalProps) => {
  const [latex, setLatex] = useState(initial);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { html, error } = useMemo(() => {
    if (!latex.trim()) return { html: '', error: null as string | null };
    try {
      return {
        html: katex.renderToString(latex, { ...KATEX_OPTIONS, throwOnError: true }),
        error: null,
      };
    } catch (e) {
      // throwOnError:false vẫn render được (in đỏ chỗ sai) — hiện cả hai để gia sư
      // thấy công thức lẫn lời báo lỗi.
      return {
        html: katex.renderToString(latex, KATEX_OPTIONS),
        error: e instanceof Error ? e.message : 'Cú pháp chưa đúng',
      };
    }
  }, [latex]);

  /** Chèn tại vị trí con trỏ; `$1` là chỗ con trỏ dừng lại sau khi chèn. */
  const insert = (snippet: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? latex.length;
    const end = el?.selectionEnd ?? latex.length;
    const selected = latex.slice(start, end);

    const body = snippet.includes('$1')
      ? snippet.replace('$1', selected)
      : snippet;
    const caret = snippet.includes('$1')
      ? start + snippet.indexOf('$1') + selected.length
      : start + body.length;

    setLatex(latex.slice(0, start) + body + latex.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  // Portal ra body + z-index CAO HƠN QuestionModal (1100): modal này mở TỪ TRONG
  // QuestionModal, nếu để nguyên trong cây DOM đó thì bị chôn phía dưới và bấm không
  // thấy gì. Đây là lý do nút Σ trông như không hoạt động.
  return createPortal(
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-md"
        style={{ backgroundColor: SURFACE, border: `1px solid ${LINE}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: `1px solid ${LINE}` }}>
          <h2 className="flex-1 text-[14px] font-semibold" style={{ color: TEXT }}>
            Chèn công thức Toán
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-sm text-slate-400 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div
            className="grid min-h-16 place-items-center rounded-md px-3 py-4 text-[17px]"
            style={{
              color: TEXT,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: `1px solid ${LINE}`,
            }}
          >
            {latex.trim() ? (
              <span dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <span className="text-[13px]" style={{ color: MUTED }}>
                Xem trước công thức
              </span>
            )}
          </div>

          {error && (
            <p className="mt-1.5 text-[12px]" style={{ color: DANGER }}>
              {error}
            </p>
          )}

          <textarea
            ref={inputRef}
            rows={2}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="Gõ LaTeX, hoặc bấm ký hiệu bên dưới"
            className="mt-2 w-full resize-none rounded-md p-2.5 font-mono text-[13px] outline-none"
            style={{
              color: TEXT,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: `1px solid ${LINE}`,
            }}
          />

          {PALETTE.map((section) => (
            <div key={section.group} className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                {section.group}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => insert(item.insert)}
                    title={item.insert.replace('$1', '…')}
                    className="min-w-9 rounded-sm px-2 py-1.5 font-serif text-[13px] transition-colors"
                    style={{ color: TEXT, border: `1px solid ${LINE}` }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: `1px solid ${LINE}` }}>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-[13px]" style={{ color: MUTED }}>
            Huỷ
          </button>
          <button
            type="button"
            disabled={!latex.trim()}
            onClick={() => onInsert(latex.trim())}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium text-white disabled:bg-slate-200 disabled:text-slate-400"
            style={latex.trim() ? { backgroundColor: ACCENT } : undefined}
          >
            <Check size={14} />
            Chèn
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default MathInputModal;
