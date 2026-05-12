import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IStorageProvider,
  StorageFile,
  StorageResult,
} from './storage.interface';

@Injectable()
export class MinioStorageProvider implements IStorageProvider {
  constructor(private configService: ConfigService) {}

  async upload(file: StorageFile): Promise<StorageResult> {
    // MinIO integration placeholder
    // Implement actual MinIO client upload here
    const storage = this.configService.get('storage');
    const endpoint = storage.minio?.endpoint;
    const bucket = storage.minio?.bucket;

    return {
      fileName: file.originalname,
      path: `${bucket}/${file.originalname}`,
      url: `http://${endpoint}/${bucket}/${file.originalname}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(_fileName: string): Promise<void> {
    // Implement MinIO delete here
  }
}
