"use client";

import { useEffect } from "react";

// [data-magnetic] の要素をカーソルにわずかに引き寄せる
export function Magnetic() {
  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const near = Math.hypot(dx, dy) < Math.max(rect.width, 120);
        el.style.transform = near ? `translate(${dx * 0.22}px, ${dy * 0.3}px)` : "";
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
