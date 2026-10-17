import { NextResponse } from "next/server";
import { logoutUrl } from "@/lib/oidc";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.redirect(logoutUrl(), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
