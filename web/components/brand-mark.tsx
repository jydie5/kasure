// 一筆の円相と、筆を置いた朱の一点
export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden>
      <path
        d="M33.5 13.2A15 15 0 1 0 35 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="34.6" cy="9.6" r="2.6" fill="var(--shu)" />
    </svg>
  );
}
