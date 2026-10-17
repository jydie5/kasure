#!/bin/sh
# Next.js を standalone ビルドし、Web Functions 用パッケージ (.next/standalone) を作る
set -e
cd "$(dirname "$0")"
. ../infra/env.sh
rm -rf .next/standalone  # 開発サーバーのキャッシュ（.next/dev）は消さない
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
cp lambda/index.js .next/standalone/index.js
# Turbopack の外部モジュールはシンボリックリンク経由なので、実体に置き換えて同梱する
python3 - <<'PY'
import os, shutil
root = ".next/standalone/.next/node_modules"
links = []
for dirpath, dirnames, filenames in os.walk(root):
    for name in dirnames + filenames:
        path = os.path.join(dirpath, name)
        if os.path.islink(path):
            links.append(path)
for path in links:
    target = os.path.realpath(path)
    os.unlink(path)
    shutil.copytree(target, path, symlinks=False) if os.path.isdir(target) else shutil.copy2(target, path)
    print("inlined", path)
PY
# ローカル専用の設定（AWS プロファイル等）を絶対に同梱しない
rm -f .next/standalone/.env .next/standalone/.env.*
find .next/standalone -name "*.map" -delete
du -sh .next/standalone
