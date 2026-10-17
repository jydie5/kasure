import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  region: process.env.AWS_REGION ?? "ap-northeast-1",
  get dsqlHost() {
    return required("DSQL_HOST");
  },
  get bucket() {
    return required("MEDIA_BUCKET");
  },
  get cognitoDomain() {
    return required("COGNITO_DOMAIN");
  },
  get cognitoClientId() {
    return required("COGNITO_CLIENT_ID");
  },
  get cognitoPoolId() {
    return required("COGNITO_POOL_ID");
  },
  get appUrl() {
    return required("APP_URL").replace(/\/$/, "");
  },
  get sessionSecretParam() {
    return process.env.SESSION_SECRET_PARAM ?? "/yohaku/session-secret";
  },
};
