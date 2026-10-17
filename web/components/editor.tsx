"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { deleteNote, saveNote, type SaveNoteInput } from "@/app/actions";
import { ACCENTS, type Accent, type Note } from "@/lib/notes-types";
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

export function Editor({ initial }: { initial: Note | null }) {
  const [id, setId] = useState(initial?.id);
  const [slug, setSlug] = useState(initial?.slug);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">(initial?.visibility ?? "private");
  const [accent, setAccent] = useState<Accent>(initial?.accent ?? "shu");
  const [coverKey, setCoverKey] = useState<string | null>(initial?.coverKey ?? null);
  const [mode, setMode] = useState<Mode>("write");
  // 集中モード: カーソルのある段落だけ濃く、離れた段落ほど墨がかすれる
  const [focusInk, setFocusInk] = useState(true);
  const [caret, setCaret] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>(initial ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState<Date | null>(initial ? new Date(initial.updatedAt) : null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const version = useRef(0);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const markDirty = () => {
    version.current++;
    setStatus("dirty");
  };

  const save = useCallback(
    async (opts: { quiet?: boolean } = {}) => {
      if (saving.current) return;
      if (!title.trim() && !body.trim()) {
        if (!opts.quiet) flash("タイトルか本文を書いてください");
        return;
      }
      saving.current = true;
      const startedVersion = version.current;
      setStatus("saving");
      const input: SaveNoteInput = { id, title, body, tags, visibility, accent, coverKey };
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
    [id, title, body, tags, visibility, accent, coverKey, flash],
  );

  // 既存ノートは 2.5 秒の静止で自動保存
  useEffect(() => {
    if (status !== "dirty" || !id) return;
    const t = window.setTimeout(() => save({ quiet: true }), 2500);
    return () => window.clearTimeout(t);
  }, [status, id, save, title, body, tags, visibility, accent, coverKey]);

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

  const insertImages = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      const el = bodyRef.current;
      const at = el?.selectionStart ?? body.length;
      const placeholders = images.map((f, i) => `![${f.name} をアップロード中…](uploading-${i})`);
      const block = `\n${placeholders.join("\n")}\n`;
      setBody((b) => b.slice(0, at) + block + b.slice(at));
      markDirty();
      for (const [i, file] of images.entries()) {
        try {
          const { src } = await upload(file);
          setBody((b) => b.replace(placeholders[i], `![${file.name.replace(/\.[^.]+$/, "")}](${src})`));
        } catch (err) {
          setBody((b) => b.replace(placeholders[i], ""));
          flash(err instanceof Error ? err.message : "アップロードできませんでした");
        }
      }
      markDirty();
    },
    [body.length, upload, flash],
  );

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

  const preview = (
    <article className="prose" style={{ marginTop: 0, "--accent": `var(--${accent === "sumi" ? "ink" : accent})` } as React.CSSProperties}>
      <h1 style={{ fontSize: "clamp(30px, 3.4vw, 48px)", lineHeight: 1.3, margin: "0 0 1em" }}>{title || "無題"}</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{body || "*本文がここに組まれます。*"}</ReactMarkdown>
    </article>
  );

  return (
    <div
      className="editor"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.relatedTarget) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        insertImages([...e.dataTransfer.files]);
      }}
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
            <div className="editor-inner">
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
                    bodyRef.current?.focus();
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
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onCover(e.target.files?.[0])}
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
              <div className="body-wrap" data-focus={focusInk && caret !== null}>
                <div className="body-mirror" aria-hidden>
                  {body ? (
                    <InkLines text={body} caret={focusInk ? caret : null} />
                  ) : (
                    <span className="body-placeholder">
                      {"ここに書く。\n\nMarkdown が使えます。画像はドラッグするか貼り付け。"}
                    </span>
                  )}
                </div>
                <textarea
                  ref={bodyRef}
                  className="body-input"
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setCaret(e.target.selectionStart);
                    markDirty();
                  }}
                  onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                  onFocus={(e) => setCaret(e.currentTarget.selectionStart)}
                  onBlur={() => setCaret(null)}
                  onPaste={(e) => {
                    const files = [...e.clipboardData.files];
                    if (files.some((f) => f.type.startsWith("image/"))) {
                      e.preventDefault();
                      insertImages(files);
                    }
                  }}
                  aria-label="本文"
                  spellCheck={false}
                />
              </div>
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
            <div className="editor-inner">{preview}</div>
          </div>
        )}
      </div>

      {dragging && <div className="drop-hint">画像をここに置く</div>}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

// 本文を段落ごとに描き、カーソルのある段落からの距離でかすれの段階を決める
function InkLines({ text, caret }: { text: string; caret: number | null }) {
  const lines = text.split("\n");
  // 空行で区切られたまとまりを段落とみなす
  const para: number[] = [];
  let p = 0;
  lines.forEach((line, i) => {
    if (line.trim() === "" && i > 0 && lines[i - 1].trim() !== "") p++;
    para.push(p);
  });
  let caretPara = -1;
  if (caret !== null) {
    const caretLine = text.slice(0, caret).split("\n").length - 1;
    caretPara = para[caretLine];
  }
  return (
    <>
      {lines.map((line, i) => {
        const level = caretPara < 0 ? 0 : Math.min(4, Math.abs(para[i] - caretPara));
        return (
          <span key={i} className="ln" data-k={level}>
            {line || "\u200b"}
            {i < lines.length - 1 ? "\n" : ""}
          </span>
        );
      })}
    </>
  );
}
