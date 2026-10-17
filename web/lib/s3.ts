import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config";

let client: S3Client | undefined;
const s3 = () => (client ??= new S3Client({ region: config.region }));

export function presignUpload(key: string, contentType: string, size: number) {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 300 },
  );
}

export function presignDownload(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
    expiresIn: 3600,
  });
}
