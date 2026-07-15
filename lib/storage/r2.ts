import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function buildR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "[r2] Variables d'environnement manquantes : R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

let cachedClient: S3Client | null = null;
function getR2Client(): S3Client {
  if (!cachedClient) cachedClient = buildR2Client();
  return cachedClient;
}

export async function uploadVideoToR2(params: {
  buffer: Buffer;
  contentType: string;
  key: string;
}): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!bucket || !publicBaseUrl) {
    throw new Error("[r2] R2_BUCKET_NAME ou R2_PUBLIC_BASE_URL manquant dans l'environnement");
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );

  return `${publicBaseUrl.replace(/\/$/, "")}/${params.key}`;
}