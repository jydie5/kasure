import type { CSSProperties } from "react";

// 1 文字ずつ下から立ち上がる見出し。行ごとにマスクする
export function SplitLine({
  text,
  start = 0,
  className,
}: {
  text: string;
  start?: number;
  className?: string;
}) {
  return (
    <span className={`line-mask ${className ?? ""}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {Array.from(text).map((ch, i) => (
          <span key={i} className="char" style={{ "--i": start + i } as CSSProperties}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
    </span>
  );
}
