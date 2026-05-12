import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IStorageProvider,
  StorageFile,
  StorageResult,
} from './storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private uploadPath: string;

  constructor(private configService: ConfigService) {
    const storage = this.configService.get('storage');
    this.uploadPath = storage.local?.path || 'uploads';
  }

  async upload(file: StorageFile): Promise<StorageResult> {
    const fileName = `${uuidv4()}-${file.originalname}`;
    const filePath = path.join(this.uploadPath, fileName);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    return {
      fileName: file.originalname,
      path: filePath,
      url: `/uploads/${fileName}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadPath, fileName);
    await fs.unlink(filePath).catch(() => {});
  }
}
