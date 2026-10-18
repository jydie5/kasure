"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, ViewTransition } from "react";
import type { NoteSummary } from "@/lib/notes-types";
import { NoteCover } from "./note-cover";
import { IndexList } from "./index-list";
import { formatDate } from "./format";
import { inkPercent, kasureAmount, kasureLevel, useNow } from "./use-kasure";

type View = "grid" | "list";

export function Library({ notes }: { notes: NoteSummary[] }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const deferredQ = useDeferredValue(q);
  const now = useNow();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeView = (v: View) => setView(v);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
  }, [notes]);

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return notes.filter(
      (n) =>
        (!tag || n.tags.includes(tag)) &&
        (!needle || `${n.title} ${n.excerpt} ${n.tags.join(" ")}`.toLowerCase().includes(needle)),
    );
  }, [notes, deferredQ, tag]);

  if (notes.length === 0) {
    return (
      <div className="empty">
        <span className="mono muted">An empty page</span>
        <p>
          まだ何も書かれていません。
          <br />
          白い紙は、いちばん自由です。
        </p>
        <Link href="/notes/new" className="btn">
          最初のノートを書く <span className="arrow">→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">ノートを検索</span>
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your notes…"
            type="search"
          />
          <span className="kbd" aria-hidden>
            /
          </span>
        </label>
        <div className="seg" role="group" aria-label="表示切替">
          <button aria-pressed={view === "grid"} onClick={() => changeView("grid")}>
            Grid
          </button>
          <button aria-pressed={view === "list"} onClick={() => changeView("list")}>
            Index
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="chips" role="group" aria-label="タグで絞り込み">
          <button className="chip" aria-pressed={tag === null} onClick={() => setTag(null)}>
            すべて
          </button>
          {tags.map(([t, n]) => (
            <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              #{t} <span className="muted" style={{ fontSize: 11 }}>{n}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <p>「{deferredQ || tag}」に合うノートはありません。</p>
        </div>
      ) : view === "grid" ? (
        <div className="cards">
          {filtered.map((note) => {
            const amount = kasureAmount(note.updatedAt, now, note.layout.decayDays);
            return (
            <Link
              key={note.id}
              href={`/n/${note.slug}`}
              className="card"
              data-kasure={kasureLevel(amount)}
              style={{ "--kasure": amount } as React.CSSProperties}
            >
              <div className="card-cover">
                <ViewTransition name={`cover-${note.id}`} share="morph" default="none">
                  <div className="ink" style={{ width: "100%", height: "100%" }}>
                    <NoteCover note={note} />
                  </div>
                </ViewTransition>
                <span className="card-badge" data-public={note.visibility === "public"}>
                  <i /> {note.visibility === "public" ? "Public" : "Private"}
                </span>
              </div>
              <h3 className="ink">{note.title}</h3>
              {note.excerpt && <p className="ink-soft">{note.excerpt}</p>}
              <div className="card-meta mono">
                <span>{formatDate(note.updatedAt)}</span>
                <span className="ink-meter" title="墨の残り。書き足すと濃く戻ります">
                  <i aria-hidden />
                  {now === null ? "墨" : `墨 ${inkPercent(amount)}%`}
                </span>
              </div>
            </Link>
            );
          })}
        </div>
      ) : (
        <IndexList
          className="list-rows"
          items={filtered.map((note) => ({
            id: note.id,
            href: `/n/${note.slug}`,
            title: note.title,
            excerpt: note.excerpt,
            lead: (
              <span className="list-thumb">
                <NoteCover note={note} />
              </span>
            ),
            cells: [note.visibility === "public" ? "● Public" : "○ Private", formatDate(note.updatedAt)],
            updatedAt: note.updatedAt,
            decayDays: note.layout.decayDays,
            preview: <NoteCover note={note} />,
          }))}
        />
      )}
    </>
  );
}
