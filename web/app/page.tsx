import Link from "next/link";
import { Suspense } from "react";
import { SplitLine } from "@/components/split-text";
import { IndexList } from "@/components/index-list";
import { NoteCover } from "@/components/note-cover";
import { SiteFooter } from "@/components/site-footer";
import { Intro, introScript } from "@/components/intro";
import { formatDate, pad } from "@/components/format";
import { listPublicNotes } from "@/lib/notes";

const STATEMENT = ["きれいに", "書く", "必要はない。", "かすれた", "線にこそ、", "考えた", "速度が", "残る。"];
const MARQUEE = [
  ["Write", "書く"],
  ["Think", "考える"],
  ["Pause", "間"],
  ["Trace", "掠れ"],
  ["Share", "分かつ"],
];

export default function Home() {
  return (
    <main id="main">
      <script dangerouslySetInnerHTML={{ __html: introScript }} />
      <Intro />
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-meta mono">
          <span className="fade-up" style={{ "--d": "0.2s" } as React.CSSProperties}>
            Vol. 01 — 2026
          </span>
          <span className="fade-up" style={{ "--d": "0.3s" } as React.CSSProperties}>
            A quiet place for thinking
          </span>
          <span className="fade-up" style={{ "--d": "0.4s" } as React.CSSProperties}>
            35.68° N, 139.76° E
          </span>
          <span className="fade-up" style={{ "--d": "0.5s", textAlign: "right" } as React.CSSProperties}>
            Tokyo / ap-northeast-1
          </span>
        </div>
        <hr className="hairline draw-line" />

        <div className="hero-tagline fade-up" style={{ "--d": "1.3s" } as React.CSSProperties} aria-hidden>
          <span className="tate">書いた跡が、</span>
          <span className="tate">かすれながら残るノート。</span>
        </div>

        <span className="hero-kanji" aria-hidden>
          掠れ
        </span>

        <h1 id="hero-title" className="hero-title display">
          <SplitLine text="Leave" />
          <SplitLine text="a faint" start={5} className="italic" />
          <span className="line-mask">
            <span className="sr-only">trace.</span>
            <span aria-hidden>
              {Array.from("trace").map((ch, i) => (
                <span key={i} className="char" style={{ "--i": 12 + i } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
              <span className="char shu" style={{ "--i": 17 } as React.CSSProperties}>
                .
              </span>
            </span>
          </span>
        </h1>

        <div className="hero-foot">
          <p className="hero-lede fade-up" style={{ "--d": "1.1s" } as React.CSSProperties}>
            書くことは、<strong>跡を残すこと。</strong>
            <br />
            通知も評価もない紙の上で、速く、粗く、
            <br className="hide-sm" />
            考えた跡を残し、熟したものだけを共有する。
          </p>
          <div className="hero-cta fade-up" style={{ "--d": "1.25s" } as React.CSSProperties}>
            <Link href="/notes/new" className="btn" prefetch={false} data-magnetic>
              書きはじめる <span className="arrow">→</span>
            </Link>
            <a href="#public" className="btn btn-ghost" data-magnetic>
              公開ノートを読む <span className="arrow">↓</span>
            </a>
          </div>
        </div>
        <span className="scroll-cue" aria-hidden />
      </section>

      <section className="section shell" aria-labelledby="statement">
        <h2 id="statement" className="sr-only">
          ステートメント
        </h2>
        <p className="statement">
          {STATEMENT.map((word, i) =>
            word === "かすれた" ? (
              <em key={i} className="word">
                {word}
              </em>
            ) : (
              <span key={i} className="word">
                {word}
              </span>
            ),
          )}
        </p>
      </section>

      <section className="section shell" style={{ paddingTop: 0 }} aria-labelledby="principles">
        <div className="section-head reveal">
          <h2 id="principles" className="section-title display">
            Three <span className="italic">quiet</span> rules
          </h2>
          <span className="mono muted">01 — 原則</span>
        </div>
        <div className="principles">
          {[
            {
              n: "i.",
              title: "静けさ",
              body: "通知も、いいねも、フォロワーもない。あるのは紙と、あなたの考えだけ。Markdown で書き、画像を置き、タグで束ねる。",
              meta: "Markdown · Images · Tags",
            },
            {
              n: "ii.",
              title: "速さと、眠り",
              body: "東京のサーバーレスで動き、使われない間は眠っている。必要な瞬間だけ目を覚まし、静かに応える。",
              meta: "Lambda Web Functions · Aurora DSQL",
            },
            {
              n: "iii.",
              title: "分かつ",
              body: "はじめは非公開で育てる。熟したら公開へ。共有はリンクひとつで、読む人には最良の組版で届く。",
              meta: "Private by default · One link",
            },
          ].map((p) => (
            <article key={p.n} className="principle reveal">
              <span className="principle-num">{p.n}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="mono">{p.meta}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} style={{ display: "flex" }}>
              {MARQUEE.map(([en, jp]) => (
                <span key={en} className="marquee-item">
                  <span className="italic">{en}</span>
                  <span className="jp">{jp}</span>
                  <span className="dot" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="public" className="section shell" aria-labelledby="public-title">
        <div className="section-head reveal">
          <h2 id="public-title" className="section-title display">
            Public <span className="italic">traces</span>
          </h2>
          <span className="mono muted">02 — 公開ノート</span>
        </div>
        <Suspense fallback={<IndexSkeleton />}>
          <PublicNotes />
        </Suspense>
      </section>

      <SiteFooter />
    </main>
  );
}

async function PublicNotes() {
  const notes = await listPublicNotes();
  if (notes.length === 0) {
    return (
      <div className="empty reveal">
        <span className="mono muted">Nothing here yet</span>
        <p>まだ公開されたノートはありません。最初の一篇を。</p>
        <Link href="/notes/new" className="btn btn-sm" prefetch={false}>
          書きはじめる <span className="arrow">→</span>
        </Link>
      </div>
    );
  }
  return (
    <IndexList
      items={notes.map((note, i) => ({
        id: note.id,
        href: `/n/${note.slug}`,
        title: note.title,
        excerpt: note.excerpt,
        lead: <span className="mono">{pad(i + 1)}</span>,
        cells: [note.ownerName, formatDate(note.updatedAt)],
        updatedAt: note.updatedAt,
        preview: <NoteCover note={note} />,
      }))}
    />
  );
}

function IndexSkeleton() {
  return (
    <ul className="index" aria-busy>
      {[0, 1, 2].map((i) => (
        <li key={i} className="index-row" style={{ padding: "28px 8px" }}>
          <div className="skeleton" style={{ height: 28, width: `${60 - i * 12}%` }} />
        </li>
      ))}
    </ul>
  );
}
