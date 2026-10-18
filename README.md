# Kasure — かすれのあるノート

きれいに書かなくていい。かすれた線にこそ、考えた速度が残る。

Next.js 16 を **AWS Lambda Web Functions** にそのまま載せた、少人数向けのノートアプリです。VPC なし・常時起動なしで、アクセスがなければ費用はほぼ $0 です。

## 特徴

- **時間で記憶がかすれる**: 最後に書いてからの日数に応じて、ノートの墨がかすれていく。書き足すと濃く戻る
- **書いた跡がかすれる集中モード**: エディタでは、カーソルのある段落だけが濃く、離れた段落ほどかすれる
- リッチエディタ（Tiptap）: 文字を選ぶと浮かぶ書式メニュー（太字・サイズ・墨色・書体・かすれマーク・リンク）、`/` の挿入メニュー、画像のドラッグ＆ドロップ、自動保存
- レイアウト: 揃え・幅・2 段組・「間」（余白ブロック）・ノート単位の縦書き
- **跡**: 段落ごとに「速度」「ためらい（書き直し）」「触れた時刻」を記録し、閲覧ページで掠れ・線のぶれ・時間の層として見える。公開ノートは**読まれた段落ほど墨が戻る**
- 非公開／公開の切り替え、ノートごとに生成される表紙（円相・雨・枯山水・日輪・青海波）
- 許可制ログイン（管理画面 `/admin` で招待したメールアドレスだけが入れる）

## 構成

```
Browser ──HTTPS──▶ Lambda Web Functions (Next.js standalone, Node.js 24 / arm64)
                     ├─ Aurora DSQL   … ノート（IAM トークン認証・公開エンドポイント）
                     ├─ Amazon S3     … 画像（署名付き URL でブラウザから直接アップロード）
                     ├─ Amazon Cognito… ログイン（managed login、許可制、招待メール）
                     └─ SSM Parameter Store … セッション暗号鍵
```

VPC を使わない構成のため、NAT Gateway の費用（東京で月 $45 前後）がかかりません。

## ディレクトリ

| パス | 内容 |
|---|---|
| `web/` | Next.js アプリ（`build.sh` でビルド、`deploy.sh` でデプロイ） |
| `web/lib/editor-schema.ts` | エディタと閲覧ページで共有する Tiptap スキーマ（許可した要素・属性・値だけが HTML になる） |
| `DESIGN.md` | リッチエディタとかすれの要件・設計 |
| `infra/` | DSQL スキーマ、IAM ポリシーの雛形、Cognito のブランディング設定 |

## セットアップ

1. AWS 側のリソース（DSQL クラスター、S3 バケット、Cognito ユーザープール、実行ロール、SSM パラメータ `/yohaku/session-secret`）を作成する
2. `cp infra/env.example.sh infra/env.sh` を実行し、値を埋める（`env.sh` は git 管理外）
3. `infra/schema.sql`、`infra/migrate-001-doc.sql`、`infra/migrate-002-reads.sql`、値を置き換えた `infra/grant.example.sql` を、DSQL の admin ロールで実行する
4. `infra/role-policy.template.json` の変数を置き換え、実行ロールにインラインポリシーとして付与する
5. ローカル開発: `web/.env.local` に環境変数を書き（下表）、`cd web && npm install && npm run dev`

### 環境変数

| 変数名 | 説明 |
|---|---|
| `DSQL_HOST` | Aurora DSQL のエンドポイント |
| `MEDIA_BUCKET` | 画像用の S3 バケット |
| `COGNITO_DOMAIN` | managed login のドメイン（`https://…amazoncognito.com`） |
| `COGNITO_CLIENT_ID` | アプリクライアント ID（シークレットなし、PKCE を使用） |
| `COGNITO_POOL_ID` | ユーザープール ID |
| `APP_URL` | アプリの URL（コールバック URL の生成に使う） |
| `ADMIN_EMAILS` | 管理画面を開けるメールアドレス（カンマ区切り） |
| `SESSION_SECRET_PARAM` | 省略可。セッション鍵の SSM パラメータ名（既定は `/yohaku/session-secret`） |

AWS の認証情報は環境変数に入れません。本番では実行ロールから自動で取得し、ローカルでは `AWS_PROFILE` を使います。

## デプロイ

```bash
cd web && ./build.sh && ./deploy.sh
```

初回だけ `CREATE=1 ./deploy.sh` で Web Function を作成します（環境数の上限 2、100 rps 制限付き）。

## 費用の目安（東京）

アクセスがない間は $0（ゼロまでスケール）。月 100 万リクエストでも数ドル程度です。DSQL は月 10 万 DPU と 1GB、Cognito は月 1 万 MAU まで無料枠があります。

## 注意

- Lambda Web Functions は 2026 年 10 月に GA になった新しいサービスです。CLI は 2.38 以降が必要です
- エンドポイントは ApplicationManaged（アプリ側で認証）で、直接公開しています。独自ドメインや WAF が必要なら、CloudFront + OAC（IamAuth）を前段に置いてください
