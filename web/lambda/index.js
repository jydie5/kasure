// Lambda Web Functions のエントリ。AWS_LAMBDA_HTTP_ENDPOINT (host:port) で待ち受ける
const endpoint = process.env.AWS_LAMBDA_HTTP_ENDPOINT ?? "0.0.0.0:3000";
const i = endpoint.lastIndexOf(":");
process.env.HOSTNAME = endpoint.slice(0, i);
process.env.PORT = endpoint.slice(i + 1);
process.on("SIGTERM", () => process.exit(0));
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./server.js");
