import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { listNotesByOwner } from "@/lib/notes";
import { Library } from "@/components/library";

export const metadata: Metadata = { title: "ライブラリ" };

export default function NotesPage() {
  return (
    <main id="main" className="page shell">
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent />
      </Suspense>
    </main>
  );
}

async function LibraryContent() {
  const viewer = await requireViewer("/notes");
  const notes = await listNotesByOwner(viewer.sub);
  return (
    <>
      <div className="page-head">
        <h1 className="page-title display">
          Your <span className="italic">traces</span>
          <sup>{String(notes.length).padStart(2, "0")}</sup>
        </h1>
        <Link href="/notes/new" className="btn">
          ＋ 新しいノート
        </Link>
      </div>
      <Library notes={notes} />
    </>
  );
}

function LibrarySkeleton() {
  return (
    <>
      <div className="page-head">
        <div className="skeleton" style={{ height: "clamp(56px, 10vw, 150px)", width: "60%" }} />
      </div>
      <div className="cards" aria-busy>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="card-cover skeleton" />
            <div className="skeleton" style={{ height: 22, width: "70%" }} />
          </div>
        ))}
      </div>
    </>
  );
}
