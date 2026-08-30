import { Fragment, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './math.css';

/**
 * Render text có LaTeX kẹp giữa `$...$` bằng KaTeX THẬT.
 */
export const KATEX_OPTIONS = {
  strict: false as const,
  throwOnError: false,
  trust: false,
  macros: { '\\frac': '{\\displaystyle\\dfrac{#1}{#2}}' },
} as const;

interface MathTextProps {
  children: string;
  className?: string;
}

const MathText = ({ children, className }: MathTextProps) => {
  const parts = useMemo(() => children.split(/(\$[^$]+\$)/g).filter(Boolean), [children]);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMath = part.length > 2 && part.startsWith('$') && part.endsWith('$');
        if (!isMath) return <Fragment key={i}>{part}</Fragment>;
        const html = katex.renderToString(part.slice(1, -1), KATEX_OPTIONS);
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </span>
  );
};

export default MathText;
