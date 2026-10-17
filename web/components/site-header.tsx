"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { NavLink } from "./nav-link";
import { BrandMark } from "./brand-mark";

export function SiteHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  return (
    <header className="site-header" data-scrolled={scrolled}>
      <Link href="/" className="brand" aria-label="Kasure ホーム">
        <BrandMark />
        <span className="brand-word">
          Kasure<em>.</em>
        </span>
      </Link>
      <nav className="nav" aria-label="メイン">
        <Link href="/#public" className="nav-link hide-xs">
          公開ノート
        </Link>
        <Suspense
          fallback={
            <Link href="/notes" className="nav-link">
              ライブラリ
            </Link>
          }
        >
          <NavLink href="/notes">ライブラリ</NavLink>
        </Suspense>
        {children}
      </nav>
    </header>
  );
}
