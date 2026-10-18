"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { generateHTML, type JSONContent } from "@tiptap/core";
import { deleteNote, saveNote, type SaveNoteInput } from "@/app/actions";
import { ACCENTS, type Accent, type Note } from "@/lib/notes-types";
import { buildExtensions, DEFAULT_LAYOUT, PACE_TYPES, newPid, type NoteLayout } from "@/lib/editor-schema";
import { clientExtensions } from "./editor-extensions";
import { BlockFloatingMenu, InkBubbleMenu, LayoutPopover, SlashMenu, createSlashExtension, type SlashItem, type SlashState } from "./editor-menus";
import { NoteGlyph } from "./note-glyph";

type Mode = "write" | "split" | "read";
type Status = "idle" | "dirty" | "saving" | "saved" | "error";

const ACCENT_LABEL: Record<Accent, string> = { sumi: "墨", shu: "朱", ai: "藍", matcha: "抹茶", kin: "金" };
const STATUS_LABEL: Record<Status, string> = {
  idle: "下書き",
  dirty: "未保存の変更",
  saving: "保存中…",
  saved: "保存しました",
  error: "保存できませんでした",
};
const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function Editor({ initial }: { initial: Note | null }) {
  const [id, setId] = useState(initial?.id);
  const [slug, setSlug] = useState(initial?.slug);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">(initial?.visibility ?? "private");
  const [accent, setAccent] = useState<Accent>(initial?.accent ?? "shu");
  const [coverKey, setCoverKey] = useState<string | null>(initial?.coverKey ?? null);
  const [layout, setLayout] = useState<NoteLayout>(initial?.layout ?? DEFAULT_LAYOUT);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("write");
  const [focusInk, setFocusInk] = useState(false);
  const [status, setStatus] = useState<Status>(initial ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState<Date | null>(initial ? new Date(initial.updatedAt) : null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<JSONContent>(initial?.doc ?? EMPTY_DOC);
  const [, startTransition] = useTransition();
  const coverInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const version = useRef(0);

  // --- スラッシュメニューの状態（Suggestion プラグインから更新される）
  const [slash, setSlash] = useState<SlashState | null>(null);
  const slashApi = useMemo(() => createSlashExtension(setSlash), []);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const markDirty = useCallback(() => {
    version.current++;
    setStatus("dirty");
  }, []);

  const upload = useCallback(async (file: File) => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size }),
    });
    const data = (await res.json()) as { url?: string; key?: string; src?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? "アップロードできませんでした");
    const put = await fetch(data.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error("アップロードできませんでした");
    return { key: data.key!, src: data.src! };
  }, []);

  // 画像のドロップ／貼り付けは editorProps から呼ばれるため、ref 経由で最新の関数を参照する
  const insertImagesRef = useRef<(files: File[], at?: number) => Promise<void>>(async () => {});

  const extensions = useMemo(() => [...clientExtensions(), slashApi.extension], [slashApi]);

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: initial?.doc ?? EMPTY_DOC,
    editorProps: {
      attributes: { class: "prose editor-prose", "aria-label": "本文", spellcheck: "false" },
      handleDrop: (view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.to;
        void insertImagesRef.current(files, pos);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        void insertImagesRef.current(files);
        return true;
      },
    },
    onCreate: ({ editor: e }) => {
      // Markdown 時代のノートは、初回だけ Markdown から読み込む（保存すると JSON になる）
      if (initial && !initial.doc && initial.body) {
        e.commands.setContent(initial.body, { contentType: "markdown", emitUpdate: false });
        setSnapshot(JSON.parse(JSON.stringify(e.getJSON())) as JSONContent);
      }
    },
    onUpdate: ({ editor: e, transaction }) => {
      setSnapshot(JSON.parse(JSON.stringify(e.getJSON())) as JSONContent);
      // 速度の記録（pace）だけの変更は「未保存」にしない。次の保存でまとめて入る
      if (!transaction.getMeta("paceWrite")) markDirty();
    },
  });

  const insertImages = useCallback(
    async (files: File[], at?: number) => {
      if (!editor) return;
      flash(files.length > 1 ? `${files.length} 枚をアップロード中…` : "アップロード中…");
      for (const file of files) {
        try {
          const { src } = await upload(file);
          const alt = file.name.replace(/\.[^.]+$/, "");
          const chain = editor.chain().focus();
          if (typeof at === "number") chain.insertContentAt(at, { type: "image", attrs: { src, alt } });
          else chain.setImage({ src, alt });
          chain.run();
          at = undefined;
        } catch (err) {
          flash(err instanceof Error ? err.message : "アップロードできませんでした");
        }
      }
    },
    [editor, upload, flash],
  );
  useEffect(() => {
    insertImagesRef.current = insertImages;
  }, [insertImages]);

  // 開発中はコンソールから editor を触れるようにする
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && editor) {
      (window as unknown as { __kasureEditor?: unknown }).__kasureEditor = editor;
    }
  }, [editor]);

  useEffect(() => {
    const pick = () => imageInput.current?.click();
    document.addEventListener("kasure:pick-image", pick);
    return () => document.removeEventListener("kasure:pick-image", pick);
  }, []);

  const save = useCallback(
    async (opts: { quiet?: boolean } = {}) => {
      if (saving.current || !editor) return;
      // ProseMirror の attrs はプロトタイプのないオブジェクトで、そのままではサーバーアクションに渡せない
      const doc = JSON.parse(JSON.stringify(editor.getJSON())) as JSONContent;
      ensurePids(doc);
      if (!title.trim() && editor.isEmpty) {
        if (!opts.quiet) flash("タイトルか本文を書いてください");
        return;
      }
      saving.current = true;
      const startedVersion = version.current;
      setStatus("saving");
      const input: SaveNoteInput = { id, title, doc, layout, tags, visibility, accent, coverKey };
      const result = await saveNote(input);
      saving.current = false;
      if (!result.ok) {
        setStatus("error");
        flash(result.error);
        return;
      }
      setSavedAt(new Date());
      setStatus(version.current === startedVersion ? "saved" : "dirty");
      if (!id) {
        setId(result.id);
        setSlug(result.slug);
        window.history.replaceState(null, "", `/notes/${result.id}/edit`);
      }
      if (!opts.quiet) flash(visibility === "public" ? "公開ノートとして保存しました" : "保存しました");
    },
    [editor, id, title, layout, tags, visibility, accent, coverKey, flash],
  );

  // 既存ノートは 2.5 秒の静止で自動保存
  useEffect(() => {
    if (status !== "dirty" || !id) return;
    const t = window.setTimeout(() => save({ quiet: true }), 2500);
    return () => window.clearTimeout(t);
  }, [status, id, save, title, snapshot, tags, visibility, accent, coverKey, layout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setMode((m) => (m === "split" ? "write" : "split"));
      }
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (status === "dirty" || status === "saving") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [save, status]);

  const onCover = async (file?: File) => {
    if (!file) return;
    try {
      setStatus("saving");
      const { key } = await upload(file);
      setCoverKey(key);
      markDirty();
    } catch (err) {
      setStatus("error");
      flash(err instanceof Error ? err.message : "アップロードできませんでした");
    }
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "").toLowerCase();
    if (!t || tags.includes(t) || tags.length >= 12) return;
    setTags([...tags, t]);
    markDirty();
  };

  const onDelete = () => {
    if (!id || !window.confirm("このノートを削除します。元に戻せません。")) return;
    startTransition(() => deleteNote(id));
  };

  const pickSlash = (item: SlashItem) => {
    if (!editor || !slash?.range) return;
    item.run(editor, slash.range);
    setSlash(null);
  };

  const accentVar = `var(--${accent === "sumi" ? "ink" : accent})`;

  return (
    <div
      className="editor"
      style={{ "--accent": accentVar } as React.CSSProperties}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.relatedTarget) setDragging(false);
      }}
      onDrop={() => setDragging(false)}
    >
      <div className="editor-bar">
        <div className="editor-bar-group">
          <Link href="/notes" className="nav-link" style={{ fontSize: 14 }}>
            ← ライブラリ
          </Link>
          <span className="status mono" data-state={status} aria-live="polite">
            <i />
            {STATUS_LABEL[status]}
            {status === "saved" && savedAt && ` · ${savedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
          </span>
        </div>
        <div className="editor-bar-group">
          <div className="seg" role="group" aria-label="表示モード">
            {(["write", "split", "read"] as Mode[]).map((m) => (
              <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === "write" ? "書く" : m === "split" ? "並べる" : "読む"}
              </button>
            ))}
          </div>
          <button
            className="toggle"
            role="switch"
            aria-checked={focusInk}
            onClick={() => setFocusInk((v) => !v)}
            title="書いている段落だけを濃く、離れた段落をかすれさせます"
          >
            <span className="toggle-track" aria-hidden />
            かすれ
          </button>
          <div className="menu">
            <button className="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-expanded={layoutOpen} onClick={() => setLayoutOpen((v) => !v)}>
              体裁{layout.writing === "vertical" ? " · 縦" : ""}
            </button>
            {layoutOpen && (
              <LayoutPopover
                layout={layout}
                onChange={(l) => {
                  setLayout(l);
                  markDirty();
                }}
                onClose={() => setLayoutOpen(false)}
              />
            )}
          </div>
          <button
            className="toggle"
            role="switch"
            aria-checked={visibility === "public"}
            onClick={() => {
              setVisibility((v) => (v === "public" ? "private" : "public"));
              markDirty();
            }}
          >
            <span className="toggle-track" aria-hidden />
            {visibility === "public" ? "公開" : "非公開"}
          </button>
          {slug && (
            <Link href={`/n/${slug}`} className="btn btn-sm btn-ghost" prefetch={false}>
              表示
            </Link>
          )}
          <button className="btn btn-sm" onClick={() => save()} disabled={status === "saving"}>
            保存 <span className="kbd" style={{ color: "inherit", borderColor: "currentColor", opacity: 0.6 }}>⌘S</span>
          </button>
        </div>
      </div>

      <div className="editor-body" data-mode={mode}>
        {mode !== "read" && (
          <div className="editor-pane">
            <div className="editor-inner" data-measure={layout.measure}>
              <textarea
                className="title-input"
                placeholder="タイトル"
                rows={1}
                value={title}
                maxLength={200}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    editor?.commands.focus("start");
                  }
                }}
                aria-label="タイトル"
              />
              <div className="meta-row">
                <div className="swatches" role="group" aria-label="差し色">
                  {ACCENTS.map((a) => (
                    <button
                      key={a}
                      className="swatch"
                      style={{ "--c": `var(--${a === "sumi" ? "ink" : a})` } as React.CSSProperties}
                      aria-pressed={accent === a}
                      aria-label={ACCENT_LABEL[a]}
                      title={ACCENT_LABEL[a]}
                      onClick={() => {
                        setAccent(a);
                        markDirty();
                      }}
                    />
                  ))}
                </div>
                <button className="cover-btn" onClick={() => coverInput.current?.click()}>
                  <span className="cover-thumb">
                    {coverKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/media/${coverKey}`} alt="" />
                    ) : (
                      <NoteGlyph id={id ?? "new"} title={title || "白"} accent={accent} />
                    )}
                  </span>
                  {coverKey ? "表紙を変更" : "表紙画像"}
                </button>
                {coverKey && (
                  <button
                    className="cover-btn"
                    onClick={() => {
                      setCoverKey(null);
                      markDirty();
                    }}
                  >
                    生成表紙に戻す
                  </button>
                )}
                <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => onCover(e.target.files?.[0])} />
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = "";
                    if (files.length) void insertImages(files);
                  }}
                />
                <div className="tag-input">
                  {tags.map((t) => (
                    <span key={t} className="tag">
                      #{t}
                      <button
                        aria-label={`${t} を外す`}
                        onClick={() => {
                          setTags(tags.filter((x) => x !== t));
                          markDirty();
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagDraft}
                    placeholder={tags.length ? "" : "タグを追加（Enter）"}
                    aria-label="タグを追加"
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        addTag(tagDraft);
                        setTagDraft("");
                      }
                      if (e.key === "Backspace" && !tagDraft && tags.length) {
                        setTags(tags.slice(0, -1));
                        markDirty();
                      }
                    }}
                    onBlur={() => {
                      if (tagDraft) {
                        addTag(tagDraft);
                        setTagDraft("");
                      }
                    }}
                  />
                </div>
              </div>

              <div className="body-wrap" data-focus={focusInk}>
                <EditorContent editor={editor} />
                {editor && <InkBubbleMenu editor={editor} />}
                {editor && <BlockFloatingMenu editor={editor} onImage={() => imageInput.current?.click()} />}
              </div>
              <p className="editor-help mono muted">
                文字を選ぶと書式 · 「/」でブロック · ⌘⇧L/E/R 揃え · ⌘⇧W 広い · ⌘⇧M 間 · ⌘\ 並べる
              </p>

              {id && (
                <div style={{ marginTop: 64, paddingTop: 18, borderTop: "1px solid var(--rule)" }}>
                  <button className="danger" onClick={onDelete}>
                    このノートを削除
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {mode !== "write" && (
          <div className="editor-pane" aria-label="プレビュー">
            <div className="editor-inner" data-measure={layout.measure}>
              <Preview title={title} doc={snapshot} layout={layout} />
            </div>
          </div>
        )}
      </div>

      <SlashMenu state={slash} onPick={pickSlash} onHover={slashApi.select} />
      {dragging && <div className="drop-hint">画像をここに置く</div>}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

// 読まれた回数を段落に結びつけるため、すべての段落に ID を持たせる
function ensurePids(node: JSONContent) {
  if (node.type && PACE_TYPES.includes(node.type)) {
    node.attrs = { ...(node.attrs ?? {}) };
    if (!node.attrs.pid) node.attrs.pid = newPid();
  }
  node.content?.forEach(ensurePids);
}

// プレビューは閲覧ページと同じスキーマから同じ HTML を生成する
const previewExtensions = buildExtensions();
function Preview({ title, doc, layout }: { title: string; doc: JSONContent; layout: NoteLayout }) {
  const html = useMemo(() => {
    try {
      return generateHTML(doc, previewExtensions);
    } catch {
      return "";
    }
  }, [doc]);
  return (
    <div className="read-body" data-writing={layout.writing} data-measure={layout.measure}>
      <h1 className="preview-title">{title || "無題"}</h1>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html || "<p><em>本文がここに組まれます。</em></p>" }} />
    </div>
  );
}
