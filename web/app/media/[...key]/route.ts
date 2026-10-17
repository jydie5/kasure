import { NextResponse, type NextRequest } from "next/server";
import { presignDownload } from "@/lib/s3";

// 画像は推測不能なキーで保存し、短時間有効な署名付き URL へリダイレクトして配信する
export async function GET(_request: NextRequest, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const objectKey = key.join("/");
  if (!/^u\/[\w-]+\/[\w-]+\.(jpg|png|webp|gif|avif)$/.test(objectKey)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const response = NextResponse.redirect(await presignDownload(objectKey), 302);
  response.headers.set("Cache-Control", "private, max-age=1800");
  return response;
}
