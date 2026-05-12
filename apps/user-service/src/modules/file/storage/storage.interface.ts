export interface StorageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StorageResult {
  fileName: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IStorageProvider {
  upload(file: StorageFile): Promise<StorageResult>;
  delete(fileName: string): Promise<void>;
}
