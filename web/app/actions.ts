"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { ACCENTS, type Accent } from "@/lib/notes-types";
import { normalizeLayout, type NoteLayout } from "@/lib/editor-schema";
import { docToText, validateDoc } from "@/lib/render-doc";
import type { JSONContent } from "@tiptap/core";

export type SaveNoteInput = {
  id?: string;
  title: string;
  doc: JSONContent;
  layout: NoteLayout;
  tags: string[];
  visibility: "private" | "public";
  accent: Accent;
  coverKey: string | null;
};

export type SaveNoteResult = { ok: true; id: string; slug: string } | { ok: false; error: string };

export async function saveNote(input: SaveNoteInput): Promise<SaveNoteResult> {
  const viewer = await requireViewer();
  const title = input.title.trim().slice(0, 200) || "無題";
  let doc: JSONContent;
  try {
    doc = validateDoc(input.doc);
  } catch (err) {
    console.error("invalid doc", err);
    return { ok: false, error: "本文の形式が正しくありません" };
  }
  // 検索・抜粋用のプレーンテキストはサーバー側で生成する（クライアントの値は信用しない）
  const body = docToText(doc).slice(0, 200_000);
  const layout = normalizeLayout(input.layout);
  const tags = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]
    .slice(0, 12)
    .map((t) => t.slice(0, 32));
  const visibility = input.visibility === "public" ? "public" : "private";
  const accent = ACCENTS.includes(input.accent) ? input.accent : "sumi";
  const coverKey =
    input.coverKey && input.coverKey.startsWith(`u/${viewer.sub}/`) ? input.coverKey : null;
  const excerpt = toExcerpt(body);

  try {
    const saved = await transaction(async (db) => {
      let id = input.id;
      let slug: string;
      if (id) {
        const res = await db.query(
          `UPDATE notes SET title=$1, body=$2, excerpt=$3, visibility=$4, accent=$5, cover_key=$6, doc=$7, layout=$8, updated_at=now()
           WHERE id=$9 AND owner_sub=$10 RETURNING slug`,
          [title, body, excerpt, visibility, accent, coverKey, JSON.stringify(doc), JSON.stringify(layout), id, viewer.sub],
        );
        if (res.rowCount === 0) throw new Error("not-found");
        slug = res.rows[0].slug;
        await db.query("DELETE FROM note_tags WHERE note_id=$1", [id]);
      } else {
        slug = makeSlug();
        const res = await db.query(
          `INSERT INTO notes (owner_sub, owner_name, title, body, excerpt, visibility, accent, cover_key, slug, doc, layout)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [viewer.sub, viewer.name, title, body, excerpt, visibility, accent, coverKey, slug, JSON.stringify(doc), JSON.stringify(layout)],
        );
        id = res.rows[0].id as string;
      }
      for (const tag of tags) {
        await db.query("INSERT INTO note_tags (note_id, tag) VALUES ($1,$2)", [id, tag]);
      }
      return { id: id!, slug };
    });

    updateTag(`note:${saved.id}`);
    updateTag(`notes:owner:${viewer.sub}`);
    updateTag("notes:public");
    return { ok: true, ...saved };
  } catch (err) {
    console.error("saveNote failed", err);
    return { ok: false, error: err instanceof Error && err.message === "not-found" ? "ノートが見つかりません" : "保存できませんでした" };
  }
}

export async function deleteNote(id: string) {
  const viewer = await requireViewer();
  await transaction(async (db) => {
    const res = await db.query("DELETE FROM notes WHERE id=$1 AND owner_sub=$2", [id, viewer.sub]);
    if (res.rowCount) await db.query("DELETE FROM note_tags WHERE note_id=$1", [id]);
  });
  updateTag(`note:${id}`);
  updateTag(`notes:owner:${viewer.sub}`);
  updateTag("notes:public");
  redirect("/notes");
}

function makeSlug() {
  const d = new Date();
  const date = `${d.getUTCFullYear() % 100}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${date}-${crypto.randomUUID().slice(0, 6)}`;
}

function toExcerpt(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

