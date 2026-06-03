/**
 * TrustedBanner — Server Component.
 * Pure static marquee; CSS animation handle scrolling.
 */

const INVESTORS = [
  { name: 'Dream-lab.ai', highlight: true },
  { name: 'FPT University', highlight: false },
] as const;

const REPEAT_COUNT = 10;

const items = Array.from({ length: REPEAT_COUNT }).flatMap(() => INVESTORS);

function Group({ keyPrefix }: { keyPrefix: string }) {
  return (
    <div className="trusted-scroll-group" aria-hidden={keyPrefix !== 'a'}>
      {items.map((inv, index) => (
        <span
          key={`${keyPrefix}-${index}`}
          className={`university-name ${inv.highlight ? 'highlight' : ''}`}
        >
          {inv.name}
        </span>
      ))}
    </div>
  );
}

export default function TrustedBanner() {
  return (
    <div className="trusted-banner">
      <div className="trusted-content">
        <div className="trusted-scroll">
          <Group keyPrefix="a" />
          <Group keyPrefix="b" />
        </div>
      </div>
    </div>
  );
}
