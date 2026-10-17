"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function ViewerMenu({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name} のメニュー`}
        onClick={() => setOpen((v) => !v)}
      >
        {(name || email || "?").slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div className="mono muted" style={{ textTransform: "none" }}>
              {email}
            </div>
          </div>
          <hr className="hairline" />
          <Link href="/notes/new" role="menuitem" className="nav-link" onClick={() => setOpen(false)}>
            新しいノート
          </Link>
          {isAdmin && (
            <Link href="/admin" role="menuitem" className="nav-link" onClick={() => setOpen(false)}>
              許可リスト（管理）
            </Link>
          )}
          <form action="/auth/logout" method="post">
            <button type="submit" role="menuitem" className="nav-link">
              ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
