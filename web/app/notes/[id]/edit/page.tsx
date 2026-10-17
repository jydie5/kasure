import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getNoteById } from "@/lib/notes";
import { Editor } from "@/components/editor";

export const metadata: Metadata = { title: "編集" };

export default function EditNotePage({ params }: PageProps<"/notes/[id]/edit">) {
  return (
    <main id="main">
      <Suspense fallback={<div className="editor" />}>
        <EditNote params={params} />
      </Suspense>
    </main>
  );
}

async function EditNote({ params }: { params: PageProps<"/notes/[id]/edit">["params"] }) {
  const { id } = await params;
  const viewer = await requireViewer(`/notes/${id}/edit`);
  const note = await getNoteById(id);
  if (!note || note.ownerSub !== viewer.sub) notFound();
  return <Editor key={note.id} initial={note} />;
}
