import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getNoteBySlug } from "@/lib/notes";
import { getViewer } from "@/lib/auth";
import { Markdown } from "@/components/markdown";
import { NoteCover } from "@/components/note-cover";
import { CopyLink } from "@/components/copy-link";
import { formatDate } from "@/components/format";

export async function generateMetadata({ params }: PageProps<"/n/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);
  if (!note || note.visibility !== "public") return { title: "ノート", robots: { index: false } };
  return { title: note.title, description: note.excerpt };
}

export default function NotePage({ params }: PageProps<"/n/[slug]">) {
  return (
    <main id="main">
      <Suspense fallback={<ReadSkeleton />}>
        <NoteView params={params} />
      </Suspense>
    </main>
  );
}

async function NoteView({ params }: { params: PageProps<"/n/[slug]">["params"] }) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);
  if (!note) notFound();

  const viewer = await getViewer();
  const isOwner = viewer?.sub === note.ownerSub;
  if (note.visibility !== "public" && !isOwner) notFound();

  const accentVar = `var(--${note.accent === "sumi" ? "ink" : note.accent})`;

  return (
    <div style={{ "--accent": accentVar } as React.CSSProperties}>
      <div className="progress" aria-hidden />
      <header className="read-hero shell">
        <aside className="read-side">
          <div className="tate">
            <span>{note.ownerName}</span>
            <span>{formatDate(note.createdAt)}</span>
            <span>{note.readingMinutes}分で読める</span>
          </div>
        </aside>
        <h1 className="read-title fade-up" style={{ "--d": "0.05s" } as React.CSSProperties}>
          {note.title}
        </h1>
        <ViewTransition name={`cover-${note.id}`} share="morph" default="none">
          <div className="read-cover">
            <NoteCover note={note} />
          </div>
        </ViewTransition>
        {note.tags.length > 0 && (
          <div className="read-tags fade-up" style={{ "--d": "0.2s" } as React.CSSProperties}>
            {note.tags.map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
            {note.visibility !== "public" && <span className="chip">非公開 — あなただけが見ています</span>}
          </div>
        )}
      </header>
      <div className="shell">
        <hr className="hairline read-rule draw-line" />
        <article className="prose fade-up" style={{ "--d": "0.3s" } as React.CSSProperties}>
          <Markdown source={note.body} />
        </article>
        <footer className="read-foot">
          <Link href={isOwner ? "/notes" : "/#public"} className="link-u">
            ← {isOwner ? "ライブラリへ" : "公開ノート一覧へ"}
          </Link>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {note.visibility === "public" && <CopyLink />}
            {isOwner && (
              <Link href={`/notes/${note.id}/edit`} className="btn btn-sm">
                編集する
              </Link>
            )}
          </div>
        </footer>
      </div>
      <div style={{ height: "clamp(80px, 12vw, 160px)" }} />
    </div>
  );
}

function ReadSkeleton() {
  return (
    <div className="read-hero shell">
      <div className="skeleton" style={{ gridColumn: "2 / span 7", height: 120 }} />
      <div className="read-cover skeleton" />
    </div>
  );
}
