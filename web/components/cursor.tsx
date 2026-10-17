"use client";

import { useEffect, useRef } from "react";

// 墨の点のようなカーソル。リンク上で膨らみ、入力欄では縦棒になる
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia("(pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let cx = x;
    let cy = y;
    let raf = 0;

    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.dataset.hidden = "false";
      const target = e.target as HTMLElement;
      el.dataset.state = target.closest("input, textarea, [contenteditable]")
        ? "text"
        : target.closest("a, button, [role=button], label, [data-cursor]")
          ? "hover"
          : "default";
    };
    const onLeave = () => (el.dataset.hidden = "true");

    document.documentElement.style.cursor = "none";
    const style = document.createElement("style");
    style.textContent = "a, button, input, textarea, label { cursor: none; }";
    document.head.appendChild(style);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.documentElement.style.cursor = "";
      style.remove();
    };
  }, []);

  return (
    <div ref={ref} className="cursor" data-hidden="true" aria-hidden>
      <div className="cursor-dot" />
    </div>
  );
}
