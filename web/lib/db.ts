import "server-only";
import { Pool, type PoolClient } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { config } from "./config";

// 1 実行環境で複数リクエストを同時に捌くため、プールは環境ごとに 1 つだけ作って使い回す
let pool: Pool | undefined;

function getPool(): Pool {
  if (pool) return pool;
  const signer = new DsqlSigner({ hostname: config.dsqlHost, region: config.region });
  pool = new Pool({
    host: config.dsqlHost,
    port: 5432,
    user: "yohaku_app",
    database: "postgres",
    ssl: true,
    // 新しい接続ごとに IAM トークンを発行（トークンは 15 分有効、接続は確立後も維持される）
    password: () => signer.getDbConnectAuthToken(),
    max: 8,
    idleTimeoutMillis: 60_000,
    // DSQL の接続は最長 60 分で切られるため、その前に入れ替える
    maxLifetimeSeconds: 50 * 60,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => console.error("pg pool error", err));
  return pool;
}

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
