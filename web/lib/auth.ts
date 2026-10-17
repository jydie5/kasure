import "server-only";
import { redirect } from "next/navigation";
import { readSession, type Session } from "./session";

export type { Session };

export async function getViewer(): Promise<Session | null> {
  return readSession();
}

export async function requireViewer(next = "/notes"): Promise<Session> {
  const session = await readSession();
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  return session;
}
