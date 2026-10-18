# Kasure — リッチエディタとかすれの設計

作成: 2026-10-18

## 1. 要件

### 1-1. 書式（インライン）

| 機能 | 操作 | 保存形式 |
|---|---|---|
| 太字・斜体・取り消し線・下線・コード | バブルメニュー / `⌘B` `⌘I` `⌘⇧S` `⌘U` `⌘E` | Tiptap マーク |
| 文字サイズ | バブルメニュー（小・標準・大・特大） | `textStyle.fontSize`（`0.85em` / 未設定 / `1.35em` / `1.8em`） |
| 墨色 | バブルメニュー（墨・朱・藍・抹茶・金・薄墨） | `textStyle.color`（CSS 変数名 `var(--shu)` など。値は許可リストから選択） |
| 書体 | バブルメニュー（明朝 / ゴシック） | `textStyle.fontFamily`（`mincho` / `gothic` のトークン） |
| リンク | バブルメニュー / `⌘K` | `link`（`http(s):` と `mailto:` のみ許可） |
| かすれ | バブルメニュー（弱・中・強） | 独自マーク `kasure { level: 1..3 }` |

### 1-2. ブロックとレイアウト

| 機能 | 操作 | 保存形式 |
|---|---|---|
| 見出し（1〜3）、引用、箇条書き、番号付き、チェックリスト、コードブロック、区切り線、画像 | `/` メニュー / Markdown 記法の入力 | Tiptap ノード |
| 揃え（左・中央・右） | ブロックのツールバー | `textAlign` 属性（段落・見出し） |
| 幅（本文幅・広い） | ブロックのツールバー | `width` 属性（段落・見出し・画像・2段組）`normal` / `wide` |
| 2段組 | `/` メニュー → 「2段組」 | 独自ノード `columns > column × 2` |
| 間（余白） | `/` メニュー → 「間」 | 独自ノード `ma { size: 1..3 }` |
| 縦書き | ノート設定（エディタ上部） | ノート属性 `layout.writing = "vertical"`。閲覧ページ全体に適用 |
| 本文の幅 | ノート設定 | `layout.measure = "narrow" / "normal" / "wide"` |

### 1-3. かすれ

| 機能 | 内容 |
|---|---|
| 書いた速度が残る | 入力中、段落ごとに「文字数 ÷ 打鍵していた秒数」を測り、段落属性 `pace`（0〜1 に正規化）として保存する。閲覧ページでは `pace` が高い段落ほど、わずかにかすれて見える（上限は 2 段階）。読みやすさを損なわないよう、本文の濃さは 7 割を下回らない |
| かすれマーク | わざと掠れさせたい語句に、強さ 1〜3 を掛ける。閲覧でもエディタでも同じ見た目 |
| 墨の持ち | ノート設定 `ink.decayDays`：7（既定）/ 30 / 0（永久、かすれない）。一覧の時間によるかすれと、墨メーターに反映する |
| 集中モード | 既存の仕組みを ProseMirror のデコレーションで再実装。カーソルのある段落からの距離で 4 段階 |

### 1-4. 互換性

- 既存ノート（Markdown のみ）は、エディタで開いた時に Markdown → Tiptap JSON へ変換し、次の保存で `doc` に入る。保存されるまでは閲覧ページは従来どおり Markdown で描画する
- `body` 列は検索用・抜粋用のプレーンテキストとして残す（Tiptap JSON からテキストを生成して保存）

## 2. 設計

### 2-1. データ

```sql
ALTER TABLE notes ADD COLUMN doc jsonb;      -- Tiptap JSON（null = Markdown 時代のノート）
ALTER TABLE notes ADD COLUMN layout jsonb;   -- { writing, measure, decayDays }
```

### 2-2. スキーマ（Tiptap 拡張）

`web/lib/editor-schema.ts` に、エディタと閲覧ページの**両方**で使う拡張一式を定義する。閲覧ページは `generateHTML(doc, extensions)` でサーバー側に HTML を生成するため、スキーマにない要素や属性は出力されない（XSS の経路を持たない）。

- `StarterKit`（link は `protocols: ['http','https','mailto']`、`autolink`）
- `TextStyle` + `FontSize` + `Color` + `FontFamily`（値は allow-list で検証。`parseHTML` で外部からの貼り付け値も正規化）
- `TextAlign`（paragraph, heading）
- `Image`（`src` は `/media/` 配下か `https:` のみ）
- `TaskList` / `TaskItem`
- `Placeholder`
- 独自: `Kasure`（マーク）、`Ma`（空白ブロック）、`Columns` / `Column`、`BlockWidth`（paragraph/heading/image/columns に `width` 属性を追加する GlobalAttributes）、`Pace`（textblock に `pace` 属性を追加する GlobalAttributes + 入力速度を測るプラグイン）、`FocusKasure`（デコレーション）

### 2-3. 画面

- **バブルメニュー**（テキスト選択時）: 書式 → サイズ → 墨色 → 書体 → かすれ → リンク。墨色と書体はポップオーバーで選ぶ
- **スラッシュメニュー**（`/` 入力時）: 見出し、引用、リスト、チェックリスト、コード、区切り、画像、2段組、間
- **ブロックハンドル**（段落の左、ホバーで表示）: 揃え・幅
- **ノート設定**（エディタ上部バーの「体裁」）: 縦書き、本文の幅、墨の持ち

### 2-4. 速度の測定

`Pace` プラグインは `docChanged` なトランザクションごとに、選択位置のテキストブロックについて「直近 2 秒以内の打鍵なら継続」とみなして `typedChars` と `typedMs` を積算する。段落を離れた時と、1.5 秒間入力が止まった時に `pace = clamp(typedChars / (typedMs / 1000) / 8, 0, 1)` を属性に書き込む（日本語の変換確定も含めて、8 文字/秒を上限とみなす）。属性の書き込みは `addToHistory: false` で、取り消し履歴を汚さない。

### 2-5. 縦書き

閲覧ページの `.prose` に `writing-mode: vertical-rl` と `text-orientation: mixed` を適用し、`max-height` を `calc(100svh - header)` にして横スクロールで読む。欧文と数字は `text-combine-upright: digits 2` で 2 桁までを縦中横にする。エディタは横書きのまま（編集効率を優先）、プレビューのみ縦書きで確認できる。
