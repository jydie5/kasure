"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { kasureAmount, kasureLevel, useNow } from "./use-kasure";

export type IndexItem = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  cells: ReactNode[];
  preview: ReactNode;
  lead: ReactNode;
  updatedAt?: string;
};

// 目次のような行リスト。ホバー中の行の表紙がカーソルに追従して浮かぶ
export function IndexList({ items, className = "" }: { items: IndexItem[]; className?: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const pos = useRef({ x: 0, y: 0, cx: 0, cy: 0, raf: 0 });

  const follow = () => {
    const p = pos.current;
    p.cx += (p.x - p.cx) * 0.16;
    p.cy += (p.y - p.cy) * 0.16;
    if (previewRef.current) {
      previewRef.current.style.left = `${p.cx}px`;
      previewRef.current.style.top = `${p.cy}px`;
    }
    p.raf = requestAnimationFrame(follow);
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pos.current;
    p.x = e.clientX + 150;
    p.y = e.clientY;
    if (!p.raf) {
      p.cx = p.x;
      p.cy = p.y;
      p.raf = requestAnimationFrame(follow);
    }
  };

  const onLeave = () => {
    setActive(null);
    cancelAnimationFrame(pos.current.raf);
    pos.current.raf = 0;
  };

  const activeItem = items.find((i) => i.id === active);
  const now = useNow();

  return (
    <div className={className} onPointerMove={onMove} onPointerLeave={onLeave}>
      <ul className="index">
        {items.map((item) => {
          const amount = item.updatedAt ? kasureAmount(item.updatedAt, now) : 0;
          return (
          <li
            key={item.id}
            className="index-row"
            data-kasure={kasureLevel(amount)}
            style={{ "--kasure": amount } as CSSProperties}
            onPointerEnter={() => setActive(item.id)}
          >
            <Link href={item.href}>
              {item.lead}
              <span className="index-title">
                <span className="ink">{item.title}</span>
                {item.excerpt && <small className="ink-soft">{item.excerpt}</small>}
              </span>
              {item.cells.map((cell, i) => (
                <span key={i} className="mono hide-sm">
                  {cell}
                </span>
              ))}
              <span className="arrow" aria-hidden>
                ↗
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
      <div ref={previewRef} className="index-preview" data-show={Boolean(activeItem)} aria-hidden>
        {activeItem?.preview}
      </div>
    </div>
  );
}
