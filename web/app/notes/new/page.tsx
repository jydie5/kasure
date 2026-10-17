import type { Metadata } from "next";
import { Suspense } from "react";
import { requireViewer } from "@/lib/auth";
import { Editor } from "@/components/editor";

export const metadata: Metadata = { title: "新しいノート" };

export default function NewNotePage() {
  return (
    <main id="main">
      <Suspense fallback={<div className="editor" />}>
        <NewNote />
      </Suspense>
    </main>
  );
}

async function NewNote() {
  await requireViewer("/notes/new");
  return <Editor initial={null} />;
}
