"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Link href={href} className="nav-link" aria-current={pathname.startsWith(href) ? "page" : undefined}>
      {children}
    </Link>
  );
}
