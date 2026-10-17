import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="page shell" style={{ display: "grid", alignContent: "center", gap: 28 }}>
      <span className="mono muted">404 — Blank page</span>
      <h1 className="page-title display">
        Not even <span className="italic">a</span> trace<span className="shu">.</span>
      </h1>
      <p className="mincho" style={{ fontSize: 20, margin: 0 }}>
        このページには、まだ何も書かれていません。
      </p>
      <div>
        <Link href="/" className="btn">
          はじめに戻る <span className="arrow">→</span>
        </Link>
      </div>
    </main>
  );
}
