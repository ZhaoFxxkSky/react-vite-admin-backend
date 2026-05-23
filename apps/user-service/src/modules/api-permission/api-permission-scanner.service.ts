import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { API_PERMISSION_KEY, ApiPermissionMeta } from '@core';
import { PrismaService } from '@core';
import { DataScopeCache, parsePermissionCode } from '@core';

interface ScanItem {
  code: string;
  name: string;
  module: string;
  category: string | null;
  method: string;
  path: string;
  description: string | null;
}

const METHOD_MAP: Record<number, string> = {
  0: 'GET',
  1: 'POST',
  2: 'PUT',
  3: 'DELETE',
  4: 'PATCH',
  5: 'ALL',
  6: 'OPTIONS',
  7: 'HEAD',
};

function getControllerPath(controller: any): string {
  const paths = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
  if (Array.isArray(paths)) {
    return paths[0] ?? '';
  }
  return paths;
}

function getMethodPath(handler: any): string {
  const paths = Reflect.getMetadata(PATH_METADATA, handler) ?? '';
  if (Array.isArray(paths)) {
    return paths[0] ?? '';
  }
  return paths;
}

function getMethodType(handler: any): string {
  const methodNum = Reflect.getMetadata(METHOD_METADATA, handler);
  return METHOD_MAP[methodNum] ?? 'UNKNOWN';
}

function normalizePath(base: string, methodPath: string): string {
  const baseNorm = base.replace(/^\//, '').replace(/\/$/, '');
  const methodNorm = methodPath.replace(/^\//, '').replace(/\/$/, '');
  if (!baseNorm) return '/' + methodNorm;
  if (!methodNorm) return '/' + baseNorm;
  return '/' + baseNorm + '/' + methodNorm;
}

@Injectable()
export class ApiPermissionScannerService implements OnModuleInit {
  private readonly logger = new Logger(ApiPermissionScannerService.name);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly prisma: PrismaService,
    private readonly dataScopeCache: DataScopeCache,
  ) {}

  async onModuleInit() {
    const result = await this.scanAndSync();
    this.logger.log(
      `[ApiPermissionScanner] inserted=${result.inserted}, updated=${result.updated}, disabled=${result.disabled}`,
    );
  }

  async scanAndSync(): Promise<{
    inserted: number;
    updated: number;
    disabled: number;
  }> {
    const scanned = this.scanControllers();

    const codeMap = new Map<string, ScanItem>();
    const duplicates: string[] = [];
    for (const item of scanned) {
      if (codeMap.has(item.code)) {
        duplicates.push(item.code);
      } else {
        codeMap.set(item.code, item);
      }
    }

    if (duplicates.length > 0) {
      const unique = [...new Set(duplicates)];
      this.logger.error(
        `[ApiPermissionScanner] Duplicate codes detected: ${unique.join(', ')}`,
      );
      throw new Error(
        `Duplicate ApiPermission codes found: ${unique.join(', ')}`,
      );
    }

    const existing = await this.prisma.apiPermission.findMany();
    const dbMap = new Map(existing.map((e) => [e.code, e]));

    let inserted = 0;
    let updated = 0;
    let disabled = 0;

    for (const [code, item] of codeMap) {
      const db = dbMap.get(code);
      if (!db) {
        await this.prisma.apiPermission.create({
          data: {
            code: item.code,
            name: item.name,
            module: item.module,
            category: item.category,
            method: item.method,
            path: item.path,
            description: item.description,
            enabled: true,
            sortOrder: 0,
          },
        });
        inserted++;
      } else {
        const needUpdate =
          db.name !== item.name ||
          db.module !== item.module ||
          db.category !== item.category ||
          db.method !== item.method ||
          db.path !== item.path ||
          db.description !== item.description;

        if (needUpdate) {
          await this.prisma.apiPermission.update({
            where: { id: db.id },
            data: {
              name: item.name,
              module: item.module,
              category: item.category,
              method: item.method,
              path: item.path,
              description: item.description,
            },
          });
          updated++;
        }
      }
    }

    for (const [code, db] of dbMap) {
      if (!codeMap.has(code) && db.enabled) {
        await this.prisma.apiPermission.update({
          where: { id: db.id },
          data: { enabled: false },
        });
        disabled++;
      }
    }

    this.populateDataScopeCache(codeMap);

    return { inserted, updated, disabled };
  }

  private populateDataScopeCache(codeMap: Map<string, ScanItem>): void {
    this.dataScopeCache.clear();
    for (const code of codeMap.keys()) {
      const { resourceCode, action } = parsePermissionCode(code);
      this.dataScopeCache.set(code, resourceCode, action);
    }
    for (const [code, mapping] of this.dataScopeCache.entries()) {
      this.logger.debug(
        `[DataScopeMap] ${code} -> ${mapping.resourceCode}/${mapping.action}`,
      );
    }
  }

  scanControllers(): ScanItem[] {
    const controllers = this.discovery.getControllers();
    const items: ScanItem[] = [];

    for (const wrapper of controllers) {
      const instance = wrapper.instance;
      if (!instance) continue;

      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) continue;

      const controllerPath = getControllerPath(wrapper.metatype);

      this.metadataScanner.scanFromPrototype(
        instance,
        prototype,
        (methodName) => {
          const handler = prototype[methodName];
          if (typeof handler !== 'function') return;

          const apiMeta: ApiPermissionMeta | undefined = Reflect.getMetadata(
            API_PERMISSION_KEY,
            handler,
          );
          if (!apiMeta) return;

          const methodPath = getMethodPath(handler);
          const methodType = getMethodType(handler);
          const fullPath = normalizePath(controllerPath, methodPath);

          items.push({
            code: apiMeta.code,
            name: apiMeta.name,
            module: apiMeta.module,
            category: apiMeta.category ?? null,
            method: methodType,
            path: fullPath,
            description: apiMeta.description ?? null,
          });
        },
      );
    }

    return items;
  }

  async preview(): Promise<{
    insert: ScanItem[];
    update: Array<{ scanned: ScanItem; db: any }>;
    disable: any[];
  }> {
    const scanned = this.scanControllers();
    const codeMap = new Map<string, ScanItem>();
    for (const item of scanned) {
      codeMap.set(item.code, item);
    }

    const existing = await this.prisma.apiPermission.findMany();
    const dbMap = new Map(existing.map((e) => [e.code, e]));

    const insert: ScanItem[] = [];
    const update: Array<{ scanned: ScanItem; db: any }> = [];
    const disable: any[] = [];

    for (const item of scanned) {
      const db = dbMap.get(item.code);
      if (!db) {
        insert.push(item);
      } else {
        const needUpdate =
          db.name !== item.name ||
          db.module !== item.module ||
          db.category !== item.category ||
          db.method !== item.method ||
          db.path !== item.path ||
          db.description !== item.description;
        if (needUpdate) {
          update.push({ scanned: item, db });
        }
      }
    }

    for (const db of existing) {
      if (!codeMap.has(db.code) && db.enabled) {
        disable.push(db);
      }
    }

    return { insert, update, disable };
  }
}
