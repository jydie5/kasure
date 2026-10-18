"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  INK_COLORS,
  INK_COLOR_LABEL,
  INK_FACES,
  INK_FACE_LABEL,
  INK_SIZES,
  INK_SIZE_LABEL,
  type InkColor,
  type InkFace,
  type InkSize,
  type NoteLayout,
} from "@/lib/editor-schema";
import { toggleWidth } from "./editor-extensions";

// ===== バブルメニュー（文字を選択した時） =====
type Group = "size" | "ink" | "face" | "kasure" | "link" | "block" | null;

export function InkBubbleMenu({ editor }: { editor: Editor }) {
  const [group, setGroup] = useState<Group>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const linkRef = useRef<HTMLInputElement>(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      underline: e.isActive("underline"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      linkHref: (e.getAttributes("link").href as string | undefined) ?? "",
      ink: (e.getAttributes("textStyle").ink as InkColor | null) ?? null,
      size: (e.getAttributes("textStyle").size as InkSize | null) ?? null,
      face: (e.getAttributes("textStyle").face as InkFace | null) ?? null,
      kasure: e.isActive("kasure") ? (e.getAttributes("kasure").level as number) : 0,
      align: (["left", "center", "right"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      wide: e.getAttributes("paragraph").width === "wide" || e.getAttributes("heading").width === "wide",
      heading: e.isActive("heading") ? (e.getAttributes("heading").level as number) : 0,
      inCode: e.isActive("codeBlock"),
    }),
  });

  const openGroup = (g: Group) => {
    const next = group === g ? null : g;
    if (next === "link") setLinkDraft(s.linkHref);
    setGroup(next);
  };
  useEffect(() => {
    if (group === "link") linkRef.current?.focus();
  }, [group]);
  useEffect(() => {
    const open = () => {
      setLinkDraft((editor.getAttributes("link").href as string | undefined) ?? "");
      setGroup("link");
    };
    document.addEventListener("kasure:link", open);
    return () => document.removeEventListener("kasure:link", open);
  }, [editor]);

  const setStyle = (attrs: Partial<{ ink: InkColor | null; size: InkSize | null; face: InkFace | null }>) =>
    editor.chain().focus().setMark("textStyle", attrs).removeEmptyTextStyle().run();

  const applyLink = () => {
    const href = linkDraft.trim();
    if (!href) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (/^(https?:\/\/|mailto:)/i.test(href)) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setGroup(null);
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="inkBubble"
      updateDelay={80}
      options={{ placement: "top", offset: 10 }}
      shouldShow={({ editor: e, state }) => !state.selection.empty && !e.isActive("image") && !e.isActive("codeBlock")}
      className="bubble"
    >
      <div className="bubble-row">
        <Btn on={s.bold} label="太字 ⌘B" onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>B</b>
        </Btn>
        <Btn on={s.italic} label="斜体 ⌘I" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i style={{ fontFamily: "var(--font-display)" }}>I</i>
        </Btn>
        <Btn on={s.underline} label="下線 ⌘U" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <u>U</u>
        </Btn>
        <Btn on={s.strike} label="取り消し線" onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>S</s>
        </Btn>
        <Btn on={s.code} label="コード ⌘E" onClick={() => editor.chain().focus().toggleCode().run()}>
          <code>{"<>"}</code>
        </Btn>
        <span className="bubble-sep" />
        <Btn on={group === "size" || !!s.size} label="文字の大きさ" onClick={() => openGroup("size")}>
          <span className="bubble-aa">
            <small>あ</small>あ
          </span>
        </Btn>
        <Btn on={group === "ink" || !!s.ink} label="墨色" onClick={() => openGroup("ink")}>
          <span className="bubble-dot" style={{ background: inkVar(s.ink ?? "sumi") }} />
        </Btn>
        <Btn on={group === "face" || !!s.face} label="書体" onClick={() => openGroup("face")}>
          <span className="mincho">明</span>
        </Btn>
        <Btn on={group === "kasure" || !!s.kasure} label="かすれ" onClick={() => openGroup("kasure")}>
          <span className="bubble-kasure">掠</span>
        </Btn>
        <span className="bubble-sep" />
        <Btn on={s.link || group === "link"} label="リンク ⌘K" onClick={() => openGroup("link")}>
          ⌁
        </Btn>
        <Btn on={group === "block"} label="段落の体裁" onClick={() => openGroup("block")}>
          ¶
        </Btn>
      </div>

      {group === "size" && (
        <div className="bubble-row bubble-sub">
          <Chip on={!s.size} onClick={() => setStyle({ size: null })}>
            標準
          </Chip>
          {INK_SIZES.map((v) => (
            <Chip key={v} on={s.size === v} onClick={() => setStyle({ size: v })}>
              {INK_SIZE_LABEL[v]}
            </Chip>
          ))}
        </div>
      )}
      {group === "ink" && (
        <div className="bubble-row bubble-sub">
          {INK_COLORS.map((c) => (
            <button
              key={c}
              className="swatch"
              style={{ "--c": inkVar(c) } as React.CSSProperties}
              aria-pressed={(s.ink ?? "sumi") === c}
              aria-label={INK_COLOR_LABEL[c]}
              title={INK_COLOR_LABEL[c]}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setStyle({ ink: c === "sumi" ? null : c })}
            />
          ))}
        </div>
      )}
      {group === "face" && (
        <div className="bubble-row bubble-sub">
          <Chip on={!s.face} onClick={() => setStyle({ face: null })}>
            本文のまま
          </Chip>
          {INK_FACES.map((f) => (
            <Chip key={f} on={s.face === f} onClick={() => setStyle({ face: f })}>
              <span className={f === "mincho" ? "mincho" : ""}>{INK_FACE_LABEL[f]}</span>
            </Chip>
          ))}
        </div>
      )}
      {group === "kasure" && (
        <div className="bubble-row bubble-sub">
          <Chip on={!s.kasure} onClick={() => editor.chain().focus().unsetMark("kasure").run()}>
            なし
          </Chip>
          {[1, 2, 3].map((lv) => (
            <Chip key={lv} on={s.kasure === lv} onClick={() => editor.chain().focus().setMark("kasure", { level: lv }).run()}>
              <span className="k-mark" data-kasure={lv}>
                {["弱", "中", "強"][lv - 1]}
              </span>
            </Chip>
          ))}
        </div>
      )}
      {group === "link" && (
        <form
          className="bubble-row bubble-sub"
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
        >
          <input
            ref={linkRef}
            className="bubble-input"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            placeholder="https://"
            onKeyDown={(e) => e.key === "Escape" && setGroup(null)}
          />
          <Chip on={false} onClick={applyLink}>
            {linkDraft.trim() ? "適用" : "外す"}
          </Chip>
        </form>
      )}
      {group === "block" && (
        <div className="bubble-row bubble-sub">
          {(["left", "center", "right"] as const).map((a) => (
            <Chip key={a} on={s.align === a} onClick={() => editor.chain().focus().setTextAlign(a).run()}>
              {a === "left" ? "左" : a === "center" ? "中" : "右"}
            </Chip>
          ))}
          <span className="bubble-sep" />
          <Chip on={s.wide} onClick={() => toggleWidth(editor)}>
            広い
          </Chip>
          <span className="bubble-sep" />
          {[1, 2, 3].map((lv) => (
            <Chip key={lv} on={s.heading === lv} onClick={() => editor.chain().focus().toggleHeading({ level: lv as 1 | 2 | 3 }).run()}>
              H{lv}
            </Chip>
          ))}
        </div>
      )}
    </BubbleMenu>
  );
}

export function inkVar(c: InkColor) {
  return c === "sumi" ? "var(--ink)" : c === "usuzumi" ? "var(--ink-3)" : `var(--${c})`;
}

function Btn({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="bubble-btn" aria-pressed={on} aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="bubble-chip" aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

// ===== 空行のフローティングメニュー（軽い入口。本体は / メニュー） =====
export function BlockFloatingMenu({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  return (
    <FloatingMenu
      editor={editor}
      pluginKey="blockFloating"
      options={{ placement: "left-start", offset: 12 }}
      shouldShow={({ view, state }) => {
        // フォーカス前に true を返すと、StrictMode の再マウントと競合して要素が消えたままになる
        if (!view.hasFocus()) return false;
        const { $from, empty } = state.selection;
        return empty && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0 && $from.depth === 1;
      }}
      className="floating"
    >
      <button type="button" className="floating-plus" title="ブロックを挿入（/）" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().insertContent("/").run()}>
        ＋
      </button>
      <span className="floating-hint mono">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          見出し
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertMa(editor, 2)}>
          間
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertColumns(editor)}>
          2段組
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onImage}>
          画像
        </button>
      </span>
    </FloatingMenu>
  );
}

export function insertMa(editor: Editor, size: 1 | 2 | 3, range?: Range) {
  const chain = editor.chain().focus();
  if (range) chain.deleteRange(range);
  // 間は選択できるアトムなので、続けて書けるように空の段落を後ろに付ける
  return chain.insertContent([{ type: "ma", attrs: { size } }, { type: "paragraph" }]).run();
}

export function insertColumns(editor: Editor, range?: Range) {
  const chain = editor.chain().focus();
  if (range) chain.deleteRange(range);
  const from = range?.from ?? editor.state.selection.from;
  chain
    .insertContent({
      type: "columns",
      content: [
        { type: "column", content: [{ type: "paragraph" }] },
        { type: "column", content: [{ type: "paragraph" }] },
      ],
    })
    .run();
  // 挿入した 2 段組の、左の段の先頭にカーソルを置く
  let target: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target !== null) return false;
    if (node.type.name === "columns" && pos >= from - 2) target = pos + 3;
  });
  if (target !== null) editor.commands.setTextSelection(target);
  return true;
}

// ===== スラッシュメニュー =====
export type SlashItem = { id: string; title: string; hint: string; glyph: string; run: (editor: Editor, range: Range) => void };

export const SLASH_ITEMS: SlashItem[] = [
  { id: "h1", title: "見出し 1", hint: "章のタイトル", glyph: "H1", run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
  { id: "h2", title: "見出し 2", hint: "節のタイトル", glyph: "H2", run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { id: "h3", title: "見出し 3", hint: "小見出し", glyph: "H3", run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { id: "quote", title: "引用", hint: "朱の罫線つき", glyph: "❝", run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { id: "ul", title: "箇条書き", hint: "・で並べる", glyph: "•", run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { id: "ol", title: "番号付き", hint: "1. 2. 3.", glyph: "1.", run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { id: "task", title: "チェックリスト", hint: "やること", glyph: "☐", run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { id: "code", title: "コード", hint: "等幅のブロック", glyph: "</>", run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { id: "hr", title: "区切り", hint: "＊　＊　＊", glyph: "＊", run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { id: "ma1", title: "間（小）", hint: "ひと呼吸の余白", glyph: "間", run: (e, r) => insertMa(e, 1, r) },
  { id: "ma3", title: "間（大）", hint: "場面を変える余白", glyph: "間", run: (e, r) => insertMa(e, 3, r) },
  { id: "cols", title: "2段組", hint: "左右に並べる", glyph: "▯▯", run: (e, r) => insertColumns(e, r) },
  { id: "image", title: "画像", hint: "ファイルを選ぶ", glyph: "▣", run: (e, r) => { e.chain().focus().deleteRange(r).run(); document.dispatchEvent(new CustomEvent("kasure:pick-image")); } },
];

export type SlashState = { items: SlashItem[]; index: number; rect: DOMRect | null; range: Range | null };

// Suggestion プラグインと React の橋渡し。選択中の index はこの閉包が持ち、React には状態として渡す
export function createSlashExtension(onState: (s: SlashState | null) => void) {
  let current: SuggestionProps<SlashItem> | null = null;
  let index = 0;
  const emit = () =>
    onState(current ? { items: current.items, index, rect: current.clientRect?.() ?? null, range: current.range } : null);
  const select = (i: number) => {
    index = i;
    emit();
  };
  const extension = Extension.create({
    name: "slashMenu",
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem>({
          editor: this.editor,
          char: "/",
          startOfLine: false,
          allowSpaces: false,
          items: ({ query }) => {
            const q = query.trim().toLowerCase();
            return SLASH_ITEMS.filter((i) => !q || i.title.toLowerCase().includes(q) || i.hint.includes(q) || i.id.includes(q)).slice(0, 9);
          },
          command: ({ editor: e, range, props }) => props.run(e, range),
          render: () => ({
            onStart: (props) => {
              current = props;
              index = 0;
              emit();
            },
            onUpdate: (props) => {
              current = props;
              index = 0;
              emit();
            },
            onKeyDown: ({ event }: SuggestionKeyDownProps) => {
              if (!current) return false;
              const n = Math.max(1, current.items.length);
              if (event.key === "ArrowDown") {
                select((index + 1) % n);
                return true;
              }
              if (event.key === "ArrowUp") {
                select((index - 1 + n) % n);
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                const item = current.items[index];
                if (item) current.command(item);
                return true;
              }
              if (event.key === "Escape") {
                current = null;
                emit();
                return true;
              }
              return false;
            },
            onExit: () => {
              current = null;
              emit();
            },
          }),
        }),
      ];
    },
  });
  return { extension, select };
}

export function SlashMenu({ state, onPick, onHover }: { state: SlashState | null; onPick: (item: SlashItem) => void; onHover: (i: number) => void }) {
  if (!state || !state.rect || state.items.length === 0) return null;
  const top = state.rect.bottom + 8 + window.scrollY;
  const left = Math.min(state.rect.left + window.scrollX, window.innerWidth - 300);
  return (
    <div className="slash" style={{ top, left }} role="listbox" aria-label="ブロックを挿入">
      {state.items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === state.index}
          className="slash-item"
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(item)}
        >
          <span className="slash-glyph">{item.glyph}</span>
          <span>
            <span className="slash-title">{item.title}</span>
            <span className="slash-hint">{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ===== 体裁（ノート全体の設定） =====
export function LayoutPopover({ layout, onChange, onClose }: { layout: NoteLayout; onChange: (l: NoteLayout) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [onClose]);

  const opt = <K extends keyof NoteLayout>(key: K, value: NoteLayout[K], label: string) => (
    <button key={String(value)} type="button" aria-pressed={layout[key] === value} onClick={() => onChange({ ...layout, [key]: value })}>
      {label}
    </button>
  );
  const rows: [string, ReactNode[]][] = [
    ["文字の向き", [opt("writing", "horizontal", "横書き"), opt("writing", "vertical", "縦書き")]],
    ["本文の幅", [opt("measure", "narrow", "狭い"), opt("measure", "normal", "標準"), opt("measure", "wide", "広い")]],
    ["墨の持ち", [opt("decayDays", 7, "7日"), opt("decayDays", 30, "30日"), opt("decayDays", 0, "永久")]],
  ];

  return (
    <div className="menu-panel layout-panel" ref={ref} role="dialog" aria-label="体裁">
      {rows.map(([label, buttons]) => (
        <div key={label} className="layout-row">
          <span className="mono muted">{label}</span>
          <div className="seg">{buttons}</div>
        </div>
      ))}
      <p className="layout-note">
        墨の持ちは、一覧でノートがかすれていく速さです。「永久」にすると、かすれません。
        <br />
        縦書きは閲覧ページと「読む」で反映されます。
      </p>
    </div>
  );
}
