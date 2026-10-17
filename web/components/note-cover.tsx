import { NoteGlyph } from "./note-glyph";
import type { Accent } from "@/lib/notes-types";

export function NoteCover({
  note,
}: {
  note: { id: string; title: string; accent: Accent; coverKey: string | null };
}) {
  if (note.coverKey) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/media/${note.coverKey}`} alt="" loading="lazy" decoding="async" />;
  }
  return <NoteGlyph id={note.id} title={note.title} accent={note.accent} />;
}
