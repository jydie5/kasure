import type { Metadata } from "next";
import { Suspense } from "react";
import { listAllowedUsers, requireAdmin } from "@/lib/admin";
import { config } from "@/lib/config";
import { AdminPanel } from "@/components/admin-panel";

export const metadata: Metadata = { title: "許可リスト", robots: { index: false } };

export default function AdminPage() {
  return (
    <main id="main" className="page shell">
      <Suspense fallback={<div className="skeleton" style={{ height: 160, width: "60%" }} />}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

async function AdminContent() {
  const viewer = await requireAdmin();
  const users = await listAllowedUsers();
  return (
    <>
      <div className="page-head">
        <h1 className="page-title display">
          Guest <span className="italic">list</span>
          <sup>{String(users.length).padStart(2, "0")}</sup>
        </h1>
        <p className="mincho" style={{ margin: 0, maxWidth: 30 + "em", color: "var(--ink-2)", lineHeight: 1.9 }}>
          ここに載っているメールアドレスだけが Kasure に入れます。追加すると、仮パスワード付きの招待メールが届きます。
          本人は初回ログイン時に自分のパスワードを設定します。
        </p>
      </div>
      <AdminPanel initialUsers={users} selfSub={viewer.sub} loginUrl={`${config.appUrl}/auth/login`} />
    </>
  );
}
