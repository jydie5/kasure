import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, pkceChallenge, randomToken } from "@/lib/oidc";

export async function GET(request: NextRequest) {
  const state = randomToken(16);
  const verifier = randomToken(48);
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const response = NextResponse.redirect(authorizeUrl(state, await pkceChallenge(verifier)));
  response.cookies.set("yohaku_oauth", JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/auth",
    maxAge: 600,
  });
  return response;
}

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/notes";
}
