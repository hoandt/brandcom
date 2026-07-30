import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Uploads a file to the Cloudflare R2 bucket and returns the public CDN URL.
 * @param buffer - File data as a Buffer
 * @param fileName - Target filename in R2
 * @param contentType - MIME type of the file
 */
export async function uploadFileToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.R2_BUCKET || "";
  const publicUrl = process.env.R2_PUBLIC_URL || "";

  // Unique filename to prevent overwrites
  const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, "-")}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Return the public CDN URL
  return `${publicUrl.replace(/\/$/, "")}/${uniqueFileName}`;
}
