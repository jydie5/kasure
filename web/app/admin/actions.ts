"use server";

import { createAllowedUser, deleteAllowedUser, listAllowedUsers, requireAdmin, type AllowedUser } from "@/lib/admin";

export type AdminResult = { ok: true; users: AllowedUser[]; message: string } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addAllowedEmail(raw: string): Promise<AdminResult> {
  await requireAdmin();
  const email = raw.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "メールアドレスの形式を確認してください" };
  try {
    await createAllowedUser(email);
    return { ok: true, users: await listAllowedUsers(), message: `${email} に招待メールを送りました` };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "UsernameExistsException") return { ok: false, error: "すでに許可されています" };
    console.error("addAllowedEmail failed", err);
    return { ok: false, error: "追加できませんでした" };
  }
}

export async function removeAllowedUser(username: string, email: string): Promise<AdminResult> {
  const viewer = await requireAdmin();
  if (viewer.sub === username) return { ok: false, error: "自分自身は外せません" };
  try {
    await deleteAllowedUser(username);
    return { ok: true, users: await listAllowedUsers(), message: `${email} の許可を取り消しました` };
  } catch (err) {
    console.error("removeAllowedUser failed", err);
    return { ok: false, error: "削除できませんでした" };
  }
}
