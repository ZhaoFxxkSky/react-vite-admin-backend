import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { LocalStorageProvider } from './storage/local.storage';
import { MinioStorageProvider } from './storage/minio.storage';

@Module({
  imports: [],
  controllers: [FileController],
  providers: [FileService, LocalStorageProvider, MinioStorageProvider],
  exports: [FileService],
})
export class FileModule {}
