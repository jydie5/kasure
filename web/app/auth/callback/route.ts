import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode } from "@/lib/oidc";
import { sealSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const raw = request.cookies.get("yohaku_oauth")?.value;
  const saved = raw ? (JSON.parse(raw) as { state: string; verifier: string; next: string }) : null;
  const code = params.get("code");

  if (!saved || !code || params.get("state") !== saved.state) {
    return NextResponse.redirect(`${config.appUrl}/?auth=failed`);
  }

  try {
    const user = await exchangeCode(code, saved.verifier);
    const response = NextResponse.redirect(`${config.appUrl}${saved.next}`);
    response.cookies.set(
      SESSION_COOKIE,
      await sealSession(user),
      sessionCookieOptions(config.appUrl.startsWith("https:")),
    );
    response.cookies.delete({ name: "yohaku_oauth", path: "/auth" });
    return response;
  } catch (err) {
    console.error("auth callback failed", err);
    return NextResponse.redirect(`${config.appUrl}/?auth=failed`);
  }
}
