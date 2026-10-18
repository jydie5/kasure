"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { Extension, type Extensions } from "@tiptap/core";
import { buildExtensions } from "@/lib/editor-schema";
import { FocusKasure, PaceTracker } from "./editor-plugins";

// Markdown 時代のノートを読み込むための拡張（保存は常に JSON で行う）
export function clientExtensions(): Extensions {
  return [
    ...buildExtensions(),
    Placeholder.configure({
      placeholder: ({ node, editor }) => {
        if (node.type.name === "heading") return `見出し ${node.attrs.level}`;
        if (editor.state.doc.childCount === 1 && node.type.name === "paragraph") {
          return "ここに書く。「/」でブロックを挿入、文字を選ぶと書式が出ます。";
        }
        return "";
      },
      includeChildren: true,
    }),
    Markdown,
    FocusKasure,
    PaceTracker,
    // 揃えのショートカットは TextAlign が持つ。幅・間・2 段組のショートカットをここで足す
    Extension.create({
      name: "kasureShortcuts",
      addKeyboardShortcuts() {
        return {
          "Mod-Shift-w": () => toggleWidth(this.editor),
          "Mod-Shift-m": () => this.editor.chain().focus().insertContent([{ type: "ma", attrs: { size: 2 } }, { type: "paragraph" }]).run(),
        };
      },
    }),
  ];
}

export function toggleWidth(editor: import("@tiptap/core").Editor) {
  const current = editor.getAttributes("paragraph").width ?? editor.getAttributes("heading").width ?? "normal";
  const next = current === "wide" ? "normal" : "wide";
  return editor
    .chain()
    .focus()
    .updateAttributes("paragraph", { width: next })
    .updateAttributes("heading", { width: next })
    .updateAttributes("image", { width: next })
    .updateAttributes("columns", { width: next })
    .updateAttributes("blockquote", { width: next })
    .updateAttributes("codeBlock", { width: next })
    .run();
}
