import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.schema';

interface UploadPdfInput {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
}

@Injectable()
export class R2StorageService {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async uploadPdf(input: UploadPdfInput) {
    const bucket = this.getBucket();
    const result = await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
    );

    return {
      bucket,
      key: input.key,
      etag: result.ETag ?? null,
    };
  }

  async createReadUrl(key: string) {
    const publicBaseUrl = this.config.get('R2_PUBLIC_BASE_URL', {
      infer: true,
    });

    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    return getSignedUrl(
      this.getClient(),
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        ResponseContentType: 'application/pdf',
      }),
      {
        expiresIn: this.getSignedUrlExpiresSeconds(),
      },
    );
  }

  async getPdfBuffer(key: string) {
    const result = await this.getClient().send(
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        ResponseContentType: 'application/pdf',
      }),
    );
    const body = result.Body as
      { transformToByteArray: () => Promise<Uint8Array> } | undefined;

    if (!body) {
      throw new ServiceUnavailableException('CV file could not be loaded.');
    }

    return {
      body: Buffer.from(await body.transformToByteArray()),
      contentLength: result.ContentLength,
      contentType: result.ContentType ?? 'application/pdf',
    };
  }

  getSignedUrlExpiresSeconds() {
    return this.config.get('R2_SIGNED_URL_EXPIRES_SECONDS', { infer: true });
  }

  buildUserCvKey(userId: string, cvId: string, originalName: string) {
    const extension = originalName.toLowerCase().endsWith('.pdf')
      ? 'pdf'
      : 'bin';

    return `users/${userId}/cvs/${cvId}/original.${extension}`;
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const accountId = this.config.get('R2_ACCOUNT_ID', { infer: true });
    const accessKeyId = this.config.get('R2_ACCESS_KEY_ID', { infer: true });
    const secretAccessKey = this.config.get('R2_SECRET_ACCESS_KEY', {
      infer: true,
    });

    if (!accountId || !accessKeyId || !secretAccessKey || !this.getBucket()) {
      throw new ServiceUnavailableException(
        'Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in server/.env.',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.client;
  }

  private getBucket() {
    const bucket = this.config.get('R2_BUCKET', { infer: true });

    if (!bucket) {
      throw new ServiceUnavailableException(
        'Cloudflare R2 bucket is missing. Please set R2_BUCKET in server/.env.',
      );
    }

    return bucket;
  }
}
