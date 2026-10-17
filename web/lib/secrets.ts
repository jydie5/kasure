import "server-only";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { config } from "./config";

let sessionKey: Promise<Uint8Array> | undefined;

// セッション暗号鍵は SSM SecureString から取得し、実行環境の寿命の間だけメモリに保持する
export function getSessionKey(): Promise<Uint8Array> {
  sessionKey ??= (async () => {
    const ssm = new SSMClient({ region: config.region });
    const res = await ssm.send(
      new GetParameterCommand({ Name: config.sessionSecretParam, WithDecryption: true }),
    );
    const secret = res.Parameter?.Value;
    if (!secret) throw new Error("Session secret is empty");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    return new Uint8Array(digest);
  })().catch((err) => {
    sessionKey = undefined;
    throw err;
  });
  return sessionKey;
}
