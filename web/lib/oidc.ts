import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config";

// Cognito managed login との Authorization Code + PKCE フロー（クライアントシークレットなし）

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
const issuer = () => `https://cognito-idp.${config.region}.amazonaws.com/${config.cognitoPoolId}`;

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

export function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export const redirectUri = () => `${config.appUrl}/auth/callback`;

export function authorizeUrl(state: string, challenge: string) {
  const url = new URL(`${config.cognitoDomain}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.cognitoClientId,
    redirect_uri: redirectUri(),
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    lang: "ja",
  }).toString();
  return url.toString();
}

export function logoutUrl() {
  const url = new URL(`${config.cognitoDomain}/logout`);
  url.search = new URLSearchParams({
    client_id: config.cognitoClientId,
    logout_uri: `${config.appUrl}/`,
  }).toString();
  return url.toString();
}

export async function exchangeCode(code: string, verifier: string) {
  const res = await fetch(`${config.cognitoDomain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.cognitoClientId,
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const tokens = (await res.json()) as { id_token: string };

  jwks ??= createRemoteJWKSet(new URL(`${issuer()}/.well-known/jwks.json`));
  const { payload } = await jwtVerify(tokens.id_token, jwks, {
    issuer: issuer(),
    audience: config.cognitoClientId,
  });
  if (payload.token_use !== "id") throw new Error("Unexpected token_use");
  const email = String(payload.email ?? "");
  return {
    sub: String(payload.sub),
    email,
    name: String(payload.name ?? "") || email.split("@")[0],
  };
}
