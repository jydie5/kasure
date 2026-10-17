import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query } from "./db";

import { type Accent, type Note, type NoteSummary } from "./notes-types";

export { ACCENTS } from "./notes-types";
export type { Accent, Note, NoteSummary };

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body?: string;
  owner_sub: string;
  owner_name: string;
  visibility: "private" | "public";
  accent: Accent;
  cover_key: string | null;
  created_at: Date;
  updated_at: Date;
  body_length: number;
};

const SUMMARY_COLUMNS = `id, slug, title, excerpt, owner_sub, owner_name, visibility, accent, cover_key,
  created_at, updated_at, char_length(body) AS body_length`;

async function attachTags<T extends Row>(rows: T[]): Promise<Map<string, string[]>> {
  const tags = new Map<string, string[]>();
  if (rows.length === 0) return tags;
  const tagRows = await query<{ note_id: string; tag: string }>(
    "SELECT note_id, tag FROM note_tags WHERE note_id = ANY($1::uuid[]) ORDER BY tag",
    [rows.map((r) => r.id)],
  );
  for (const { note_id, tag } of tagRows) {
    tags.set(note_id, [...(tags.get(note_id) ?? []), tag]);
  }
  return tags;
}

function toSummary(row: Row, tags: Map<string, string[]>): NoteSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    ownerSub: row.owner_sub,
    ownerName: row.owner_name,
    visibility: row.visibility,
    accent: row.accent,
    coverKey: row.cover_key,
    tags: tags.get(row.id) ?? [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    // 日本語は 1 分 500 字程度で概算
    readingMinutes: Math.max(1, Math.round(Number(row.body_length) / 500)),
  };
}

export async function listPublicNotes(limit = 24): Promise<NoteSummary[]> {
  "use cache";
  cacheTag("notes:public");
  cacheLife("minutes");
  const rows = await query<Row>(
    `SELECT ${SUMMARY_COLUMNS} FROM notes WHERE visibility = 'public' ORDER BY updated_at DESC LIMIT $1`,
    [limit],
  );
  const tags = await attachTags(rows);
  return rows.map((r) => toSummary(r, tags));
}

export async function listNotesByOwner(ownerSub: string): Promise<NoteSummary[]> {
  "use cache";
  cacheTag(`notes:owner:${ownerSub}`);
  cacheLife("hours");
  const rows = await query<Row>(
    `SELECT ${SUMMARY_COLUMNS} FROM notes WHERE owner_sub = $1 ORDER BY updated_at DESC LIMIT 500`,
    [ownerSub],
  );
  const tags = await attachTags(rows);
  return rows.map((r) => toSummary(r, tags));
}

async function getNoteWhere(column: "id" | "slug", value: string): Promise<Note | null> {
  const rows = await query<Row>(
    `SELECT ${SUMMARY_COLUMNS}, body FROM notes WHERE ${column} = $1 LIMIT 1`,
    [value],
  );
  const row = rows[0];
  if (!row) return null;
  const tags = await attachTags(rows);
  return { ...toSummary(row, tags), body: row.body ?? "" };
}

export async function getNoteBySlug(slug: string): Promise<Note | null> {
  "use cache";
  cacheLife("hours");
  const note = await getNoteWhere("slug", slug);
  cacheTag(note ? `note:${note.id}` : `note:slug:${slug}`);
  return note;
}

export async function getNoteById(id: string): Promise<Note | null> {
  "use cache";
  cacheTag(`note:${id}`);
  cacheLife("hours");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getNoteWhere("id", id);
}
