import "server-only";
import { generateText, getSchema, type JSONContent } from "@tiptap/core";
// サーバーでは DOM を使わない @tiptap/html 版を使う（@tiptap/core 版は window を参照する）
import { generateHTML } from "@tiptap/html";
import { Node as PMNode } from "@tiptap/pm/model";
import { buildExtensions } from "./editor-schema";

const extensions = buildExtensions();
const schema = getSchema(extensions);

export const MAX_DOC_BYTES = 400_000;

// クライアントから届いた JSON をスキーマで検証し、保存用に正規化する。
// 不正な構造・属性は例外になるか、スキーマ側で落とされる。
export function validateDoc(input: unknown): JSONContent {
  if (!input || typeof input !== "object") throw new Error("doc must be an object");
  const raw = JSON.stringify(input);
  if (raw.length > MAX_DOC_BYTES) throw new Error("doc too large");
  const node = PMNode.fromJSON(schema, input);
  node.check();
  return node.toJSON() as JSONContent;
}

export function docToHTML(doc: JSONContent): string {
  return generateHTML(doc, extensions);
}

export function docToText(doc: JSONContent): string {
  return generateText(doc, extensions, { blockSeparator: "\n" });
}
