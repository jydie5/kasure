import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lambda Web Functions 用に node_modules 込みの最小サーバーを出力
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Lambda の /var/task は読み取り専用。キャッシュは実行環境のメモリに保持する
    isrFlushToDisk: false,
  },
};

export default nextConfig;
