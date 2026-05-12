import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService, AppLogger, LogMethod } from '@core';
import { LocalStorageProvider } from './storage/local.storage';
import { MinioStorageProvider } from './storage/minio.storage';
import { StorageFile } from './storage/storage.interface';
import { PaginatedResponse } from '@shared';

@Injectable()
export class FileService {
  private storage: LocalStorageProvider | MinioStorageProvider;
  private storageType: string;

  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService,
    private localStorage: LocalStorageProvider,
    private minioStorage: MinioStorageProvider,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(FileService.name);
    const storage = this.configService.get('storage');
    this.storageType = storage.type || 'local';
    this.storage = this.storageType === 'minio' ? this.minioStorage : this.localStorage;
  }

  @LogMethod()
  async upload(file: StorageFile, userId: number) {
    this.logger.info(`Uploading file: ${file.originalname}, userId=${userId}`);

    const result = await this.storage.upload(file);

    const record = await this.prisma.file.create({
      data: {
        userId,
        originalName: result.fileName,
        fileName: result.fileName,
        path: result.path,
        url: result.url,
        storageType: this.storageType,
        size: result.size,
        mimeType: result.mimeType,
      },
    });

    this.logger.info(`File uploaded: id=${record.id}, name=${result.fileName}`);
    return { id: record.id, ...result };
  }

  @LogMethod()
  async pageByUserId(userId: number, current = 1, pageSize = 10) {
    this.logger.info(
      `Listing files: userId=${userId}, current=${current}, pageSize=${pageSize}`,
    );

    const offset = (current - 1) * pageSize;

    const total = await this.prisma.file.count({
      where: { userId },
    });

    const data = await this.prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: offset,
    });

    return new PaginatedResponse(data, total, current, pageSize);
  }

  @LogMethod()
  async getById(id: number, userId: number) {
    this.logger.info(`Finding file: id=${id}, userId=${userId}`);

    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      this.logger.warn(`File not found: id=${id}`);
      throw new NotFoundException('File not found');
    }
    if (file.userId !== userId) {
      this.logger.warn(
        `File access denied: id=${id}, owner=${file.userId}, requester=${userId}`,
      );
      throw new NotFoundException('File not found');
    }

    return file;
  }

  @LogMethod()
  async removeById(id: number, userId: number) {
    this.logger.info(`Deleting file: id=${id}, userId=${userId}`);

    const file = await this.getById(id, userId);

    await this.storage.delete(file.fileName);
    await this.prisma.file.delete({ where: { id } });

    this.logger.info(`File deleted: id=${id}`);
    return { message: 'File deleted successfully' };
  }
}
