import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Client = null;
const isS3Configured = !!process.env.SUPABASE_S3_ENDPOINT;

if (isS3Configured) {
  s3Client = new S3Client({
    forcePathStyle: true,
    region: process.env.SUPABASE_S3_REGION || 'us-east-1',
    endpoint: process.env.SUPABASE_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY || '',
      secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY || ''
    }
  });
}

/**
 * Uploads a document/file buffer to S3 storage bucket.
 * @param {Buffer} fileBuffer - File buffer from Multer
 * @param {string} originalName - Original filename or base string
 * @param {string} mimeType - File MIME type (e.g. application/pdf, image/png)
 * @param {number} companyId - Tenant Company ID
 * @returns {Promise<string|null>} - Returns the uploaded public URL or null if failed/unconfigured
 */
export async function uploadInvoiceToS3(fileBuffer, originalName, mimeType, companyId) {
  if (!isS3Configured || !s3Client) {
    console.warn("[S3Service] S3 storage is not configured. File upload skipped.");
    return null;
  }

  try {
    const bucketName = process.env.SUPABASE_S3_BUCKET || 'invoices';
    const ext = originalName.includes('.') ? originalName.split('.').pop() : (mimeType === 'application/pdf' ? 'pdf' : 'png');
    const fileName = `ocr-invoices/co-${companyId}-${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    const projectUrl = process.env.SUPABASE_S3_ENDPOINT.replace('/storage/v1/s3', '');
    const publicUrl = `${projectUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
    console.log(`[S3Service] Successfully uploaded document to S3: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error("[S3Service] Failed to upload document to S3:", err?.message || err);
    return null;
  }
}
