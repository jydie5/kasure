import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { presignUpload } from "@/lib/s3";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { contentType, size } = (await request.json()) as { contentType?: string; size?: number };
  const ext = contentType ? TYPES[contentType] : undefined;
  if (!ext || !size || size <= 0 || size > MAX_BYTES) {
    return NextResponse.json({ error: "画像（10MB まで）を選んでください" }, { status: 400 });
  }

  const key = `u/${session.sub}/${crypto.randomUUID()}.${ext}`;
  const url = await presignUpload(key, contentType!, size);
  return NextResponse.json({ url, key, src: `/media/${key}` });
}
