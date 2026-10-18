"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { PACE_TYPES } from "@/lib/editor-schema";

// ===== 集中モード: カーソルのあるブロックからの距離で、他のブロックをかすれさせる =====
const focusKey = new PluginKey("focusKasure");

function focusDecorations(state: EditorState): DecorationSet {
  const { doc, selection } = state;
  const $from = selection.$from;
  // カーソルを含む最上位ブロック（2 段組の中なら段組全体）の index
  const blocks: { pos: number; node: typeof doc }[] = [];
  doc.forEach((node, offset) => blocks.push({ pos: offset, node }));
  const topPos = $from.depth >= 1 ? $from.before(1) : null;
  const current = blocks.findIndex((b) => b.pos === topPos);
  if (current < 0) return DecorationSet.empty;
  const decos = blocks.map((b, i) =>
    Decoration.node(b.pos, b.pos + b.node.nodeSize, { "data-k": String(Math.min(4, Math.abs(i - current))) }),
  );
  return DecorationSet.create(doc, decos);
}

export const FocusKasure = Extension.create({
  name: "focusKasure",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusKey,
        state: {
          init: (_, state) => focusDecorations(state),
          apply: (tr, old, _oldState, newState) =>
            tr.docChanged || tr.selectionSet ? focusDecorations(newState) : old,
        },
        props: {
          decorations(state) {
            return focusKey.getState(state) as DecorationSet;
          },
        },
      }),
    ];
  },
});

// ===== 書いた速度: 段落ごとに「文字数 ÷ 打鍵していた秒数」を測り、pace 属性に残す =====
// 速く書いた段落ほど、閲覧でわずかにかすれる（「かすれた線にこそ、考えた速度が残る」）
const PACE_META = "paceWrite";
const CONTINUE_MS = 2000; // この間隔以内の打鍵は「書き続けている」とみなす
const IDLE_FLUSH_MS = 1500;
const MIN_CHARS = 12;
const MIN_MS = 2000;
const MAX_CPS = 5; // 日本語入力でこの速さなら「速い」とみなす上限（文字/秒）

type Tracked = { pos: number; len: number; typedChars: number; typedMs: number; lastTs: number };

export const PaceTracker = Extension.create({
  name: "paceTracker",
  addProseMirrorPlugins() {
    let tracked: Tracked | null = null;
    let timer: number | undefined;

    const flush = (view: EditorView) => {
      if (!tracked) return;
      const t = tracked;
      tracked = null;
      if (t.typedChars < MIN_CHARS || t.typedMs < MIN_MS) return;
      const node = view.state.doc.nodeAt(t.pos);
      if (!node || !PACE_TYPES.includes(node.type.name)) return;
      const cps = t.typedChars / (t.typedMs / 1000);
      const pace = Math.round(Math.min(1, cps / MAX_CPS) * 100) / 100;
      // すでに記録がある段落は、過去の速度と平均して「書き足し」を反映する
      const prev = typeof node.attrs.pace === "number" ? node.attrs.pace : null;
      const next = prev === null ? pace : Math.round(((prev + pace) / 2) * 100) / 100;
      if (next === prev) return;
      const tr = view.state.tr.setNodeMarkup(t.pos, undefined, { ...node.attrs, pace: next });
      tr.setMeta("addToHistory", false).setMeta(PACE_META, true);
      view.dispatch(tr);
    };

    const textblockAt = (state: EditorState) => {
      const $from = state.selection.$from;
      for (let d = $from.depth; d >= 1; d--) {
        const node = $from.node(d);
        if (node.isTextblock) return { pos: $from.before(d), node };
      }
      return null;
    };

    return [
      new Plugin({
        key: new PluginKey("paceTracker"),
        view() {
          return {
            update(v, prevState) {
              if (v.state.doc === prevState.doc) return;
              const block = textblockAt(v.state);
              if (!block || !PACE_TYPES.includes(block.node.type.name)) return;
              const now = Date.now();
              if (tracked && tracked.pos !== block.pos) {
                // 別の段落に移った: 前の段落の記録を確定する
                const prevNode = v.state.doc.nodeAt(tracked.pos);
                if (prevNode) flush(v);
                else tracked = null;
              }
              if (!tracked) {
                tracked = { pos: block.pos, len: block.node.textContent.length, typedChars: 0, typedMs: 0, lastTs: now };
                return;
              }
              const len = block.node.textContent.length;
              const delta = len - tracked.len;
              const gap = now - tracked.lastTs;
              if (delta > 0) {
                tracked.typedChars += delta;
                tracked.typedMs += Math.min(gap, CONTINUE_MS);
              }
              tracked.len = len;
              tracked.lastTs = now;
              window.clearTimeout(timer);
              timer = window.setTimeout(() => flush(v), IDLE_FLUSH_MS);
            },
            destroy() {
              window.clearTimeout(timer);
              tracked = null;
            },
          };
        },
        // 自分の属性更新や、他の変更で位置がずれた時に追従する
        appendTransaction(trs) {
          if (!tracked) return null;
          for (const tr of trs) {
            if (tr.getMeta(PACE_META)) continue;
            if (tr.docChanged) tracked.pos = tr.mapping.map(tracked.pos, -1);
          }
          return null;
        },
      }),
    ];
  },
});
