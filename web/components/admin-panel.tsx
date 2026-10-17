"use client";

import { useState, useTransition } from "react";
import { addAllowedEmail, removeAllowedUser, type AdminResult } from "@/app/admin/actions";
import type { AllowedUser } from "@/lib/admin-types";
import { formatDate } from "./format";

export function AdminPanel({
  initialUsers,
  selfSub,
  loginUrl,
}: {
  initialUsers: AllowedUser[];
  selfSub: string;
  loginUrl: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handle = (result: AdminResult) => {
    if (result.ok) {
      setUsers(result.users);
      setToast(result.message);
    } else {
      setToast(result.error);
    }
    window.setTimeout(() => setToast(null), 2800);
  };

  return (
    <>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await addAllowedEmail(email);
            handle(result);
            if (result.ok) setEmail("");
          });
        }}
      >
        <label className="search">
          <span className="sr-only">許可するメールアドレス</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="off"
          />
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(loginUrl);
              setToast("ログイン用リンクをコピーしました");
              window.setTimeout(() => setToast(null), 2200);
            }}
          >
            ログインリンクをコピー
          </button>
          <button type="submit" className="btn btn-sm" disabled={pending}>
            {pending ? "送信中…" : "招待する"}
          </button>
        </div>
      </form>

      <ul className="index guest-list" aria-busy={pending}>
        {users.map((user, i) => (
          <li key={user.username} className="guest-row">
            <span className="mono muted">{String(i + 1).padStart(3, "0")}</span>
            <span className="guest-email">{user.email}</span>
            <span className="mono muted hide-sm">{formatDate(user.createdAt)}</span>
            <span className="mono hide-sm" data-status={user.status}>
              {user.status === "CONFIRMED"
                ? "● 有効"
                : user.status === "FORCE_CHANGE_PASSWORD"
                  ? "○ 招待中"
                  : user.status === "DISABLED"
                    ? "○ 停止中"
                    : `○ ${user.status}`}
            </span>
            {user.username === selfSub ? (
              <span className="mono muted">あなた</span>
            ) : (
              <button
                className="danger"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`${user.email} の許可を取り消します。この人のノートは残ります。`)) return;
                  startTransition(async () => handle(await removeAllowedUser(user.username, user.email)));
                }}
              >
                取り消す
              </button>
            )}
          </li>
        ))}
      </ul>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
