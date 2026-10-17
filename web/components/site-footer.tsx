import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <div className="footer-cta">
        <h2 className="display reveal">
          Leave a
          <br />
          <span className="italic">trace</span>
          <span className="shu">.</span>
        </h2>
        <Link href="/notes/new" className="btn" prefetch={false} data-magnetic>
          最初のノートを書く <span className="arrow">→</span>
        </Link>
      </div>
      <p className="footer-word" aria-hidden>
        掠れ
      </p>
      <div className="footer-bar mono muted">
        <span>© 2026 Kasure</span>
        <span>Lambda Web Functions · Aurora DSQL · S3 · Cognito</span>
        <span>Made quietly in Tokyo</span>
      </div>
    </footer>
  );
}
