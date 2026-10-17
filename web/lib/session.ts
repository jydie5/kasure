import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { EncryptJWT, jwtDecrypt } from "jose";
import { getSessionKey } from "./secrets";

export type Session = { sub: string; name: string; email: string };

export const SESSION_COOKIE = "yohaku_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export async function sealSession(session: Session): Promise<string> {
  return new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .encrypt(await getSessionKey());
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // 有効期限の判定に現在時刻を使うため、リクエスト時の処理であることを明示する
  await connection();
  try {
    const { payload } = await jwtDecrypt(token, await getSessionKey());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE };
}
