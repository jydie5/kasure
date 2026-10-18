// エディタ（クライアント）と閲覧ページ（サーバー）の両方で使う Tiptap スキーマ。
// 閲覧ページはこのスキーマから HTML を生成するため、ここで許可していない要素・属性・値は一切出力されない。
import { Extension, Mark, Node, mergeAttributes, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

// ---------- 許可する値 ----------
export const INK_COLORS = ["sumi", "shu", "ai", "matcha", "kin", "usuzumi"] as const;
export type InkColor = (typeof INK_COLORS)[number];
export const INK_COLOR_LABEL: Record<InkColor, string> = {
  sumi: "墨",
  shu: "朱",
  ai: "藍",
  matcha: "抹茶",
  kin: "金",
  usuzumi: "薄墨",
};

export const INK_SIZES = ["s", "l", "xl"] as const;
export type InkSize = (typeof INK_SIZES)[number];
export const INK_SIZE_LABEL: Record<InkSize, string> = { s: "小", l: "大", xl: "特大" };

export const INK_FACES = ["mincho", "gothic"] as const;
export type InkFace = (typeof INK_FACES)[number];
export const INK_FACE_LABEL: Record<InkFace, string> = { mincho: "明朝", gothic: "ゴシック" };

export const BLOCK_WIDTHS = ["normal", "wide"] as const;
export type BlockWidth = (typeof BLOCK_WIDTHS)[number];

export type NoteLayout = {
  writing: "horizontal" | "vertical";
  measure: "narrow" | "normal" | "wide";
  decayDays: 0 | 7 | 30;
};
export const DEFAULT_LAYOUT: NoteLayout = { writing: "horizontal", measure: "normal", decayDays: 7 };

export function normalizeLayout(input: unknown): NoteLayout {
  const o = (input ?? {}) as Partial<Record<keyof NoteLayout, unknown>>;
  return {
    writing: o.writing === "vertical" ? "vertical" : "horizontal",
    measure: o.measure === "narrow" || o.measure === "wide" ? o.measure : "normal",
    decayDays: o.decayDays === 0 || o.decayDays === 30 ? o.decayDays : 7,
  };
}

const oneOf = <T extends string>(allowed: readonly T[], value: unknown): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

// ---------- 文字の書式（textStyle マークの属性として持つ） ----------
const InkStyle = Extension.create({
  name: "inkStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          ink: {
            default: null,
            parseHTML: (el) => oneOf(INK_COLORS, el.getAttribute("data-ink")),
            renderHTML: (attrs) => (attrs.ink ? { "data-ink": attrs.ink } : {}),
          },
          size: {
            default: null,
            parseHTML: (el) => oneOf(INK_SIZES, el.getAttribute("data-size")),
            renderHTML: (attrs) => (attrs.size ? { "data-size": attrs.size } : {}),
          },
          face: {
            default: null,
            parseHTML: (el) => oneOf(INK_FACES, el.getAttribute("data-face")),
            renderHTML: (attrs) => (attrs.face ? { "data-face": attrs.face } : {}),
          },
        },
      },
    ];
  },
});

// ---------- かすれマーク ----------
export const KasureMark = Mark.create({
  name: "kasure",
  addAttributes() {
    return {
      level: {
        default: 2,
        parseHTML: (el) => Math.min(3, Math.max(1, Number(el.getAttribute("data-kasure")) || 2)),
        renderHTML: (attrs) => ({ "data-kasure": attrs.level }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-kasure]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "k-mark" }), 0];
  },
});

// ---------- 間（余白ブロック） ----------
export const Ma = Node.create({
  name: "ma",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      size: {
        default: 2,
        parseHTML: (el) => Math.min(3, Math.max(1, Number(el.getAttribute("data-ma")) || 2)),
        renderHTML: (attrs) => ({ "data-ma": attrs.size }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-ma]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "ma", "aria-hidden": "true" })];
  },
});

// ---------- 2 段組 ----------
export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-column": "", class: "column" }), 0];
  },
});

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column column",
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-columns": "", class: "columns" }), 0];
  },
});

// ---------- ブロック属性: 幅と、書いた速度 ----------
export const PACE_TYPES = ["paragraph", "heading"];
export const WIDTH_TYPES = ["paragraph", "heading", "image", "columns", "blockquote", "codeBlock"];

// 0〜1 の速度を 0〜3 の見た目の段階に落とす
export function paceLevel(pace: number | null | undefined) {
  if (!pace || pace < 0.35) return 0;
  return pace < 0.6 ? 1 : pace < 0.85 ? 2 : 3;
}

// 0〜1 のためらい（消した量 ÷ 残った量）を 0〜3 に落とす
export function hesitationLevel(hes: number | null | undefined) {
  if (!hes || hes < 0.25) return 0;
  return hes < 0.6 ? 1 : hes < 1.2 ? 2 : 3;
}

export const PID_RE = /^[a-z0-9]{6,10}$/;
export function newPid() {
  return Math.random().toString(36).slice(2, 10);
}

const BlockAttrs = Extension.create({
  name: "blockAttrs",
  addGlobalAttributes() {
    return [
      {
        types: WIDTH_TYPES,
        attributes: {
          width: {
            default: null,
            parseHTML: (el) => oneOf(BLOCK_WIDTHS, el.getAttribute("data-width")),
            renderHTML: (attrs) => (attrs.width && attrs.width !== "normal" ? { "data-width": attrs.width } : {}),
          },
        },
      },
      {
        // 段落が持つ「跡」: 速度・ためらい・最後に触れた時刻・段落 ID・読まれた回数（サーバーが付ける）
        types: PACE_TYPES,
        attributes: {
          pace: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs) => {
              const level = paceLevel(attrs.pace);
              return level ? { "data-pace": level } : {};
            },
          },
          hes: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs) => {
              const level = hesitationLevel(attrs.hes);
              return level ? { "data-hes": level } : {};
            },
          },
          touched: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs) =>
              typeof attrs.touched === "string" && /^\d{4}-\d{2}-\d{2}T/.test(attrs.touched) ? { "data-touched": attrs.touched } : {},
          },
          pid: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs) => (typeof attrs.pid === "string" && PID_RE.test(attrs.pid) ? { "data-pid": attrs.pid } : {}),
          },
          reads: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs) => (typeof attrs.reads === "number" && attrs.reads > 0 ? { "data-reads": Math.min(3, attrs.reads) } : {}),
          },
        },
      },
    ];
  },
});

// ---------- 画像: /media/ 配下か https のみ ----------
const SafeImage = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      src: {
        default: null,
        parseHTML: (el) => {
          const src = el.getAttribute("src") ?? "";
          return /^(\/media\/u\/[\w-]+\/[\w-]+\.(jpg|png|webp|gif|avif)|https:\/\/[^\s"'<>]+)$/.test(src) ? src : null;
        },
      },
    };
  },
});

// ---------- 一式 ----------
export function buildExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noreferrer noopener" },
      },
      codeBlock: { HTMLAttributes: { spellcheck: "false" } },
    }),
    TextStyle,
    InkStyle,
    TextAlign.configure({ types: ["paragraph", "heading"], alignments: ["left", "center", "right"] }),
    SafeImage.configure({ allowBase64: false }),
    TaskList,
    TaskItem.configure({ nested: false }),
    KasureMark,
    Ma,
    Columns,
    Column,
    BlockAttrs,
  ];
}
