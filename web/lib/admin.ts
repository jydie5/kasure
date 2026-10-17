import "server-only";
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import { notFound } from "next/navigation";
import { config } from "./config";
import { requireViewer } from "./auth";

import type { AllowedUser } from "./admin-types";
export type { AllowedUser };

let client: CognitoIdentityProviderClient | undefined;
const cognito = () => (client ??= new CognitoIdentityProviderClient({ region: config.region }));

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export function isAdminEmail(email: string | undefined) {
  return Boolean(email) && adminEmails().includes(email!.toLowerCase());
}

export async function requireAdmin() {
  const viewer = await requireViewer("/admin");
  if (!isAdminEmail(viewer.email)) notFound();
  return viewer;
}

function toAllowed(user: UserType): AllowedUser {
  const attr = (name: string) => user.Attributes?.find((a) => a.Name === name)?.Value ?? "";
  return {
    username: user.Username ?? "",
    email: attr("email"),
    createdAt: (user.UserCreateDate ?? new Date()).toISOString(),
    status: user.Enabled === false ? "DISABLED" : (user.UserStatus ?? ""),
  };
}

export async function listAllowedUsers(): Promise<AllowedUser[]> {
  const users: AllowedUser[] = [];
  let token: string | undefined;
  do {
    const res = await cognito().send(
      new ListUsersCommand({ UserPoolId: config.cognitoPoolId, Limit: 60, PaginationToken: token }),
    );
    users.push(...(res.Users ?? []).map(toAllowed));
    token = res.PaginationToken;
  } while (token);
  return users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// 許可リストへの追加 = Cognito ユーザーの作成。Cognito から仮パスワード付きの招待メールが届き、
// 本人が初回ログイン時にパスワードを設定する
export async function createAllowedUser(email: string) {
  await cognito().send(
    new AdminCreateUserCommand({
      UserPoolId: config.cognitoPoolId,
      Username: email,
      DesiredDeliveryMediums: ["EMAIL"],
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
    }),
  );
}

export async function deleteAllowedUser(username: string) {
  await cognito().send(new AdminDeleteUserCommand({ UserPoolId: config.cognitoPoolId, Username: username }));
}
