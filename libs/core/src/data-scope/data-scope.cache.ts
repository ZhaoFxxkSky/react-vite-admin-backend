import { Injectable } from '@nestjs/common';

@Injectable()
export class DataScopeCache {
  private map = new Map<string, { resourceCode: string; action: string }>();

  set(code: string, resourceCode: string, action: string): void {
    this.map.set(code, { resourceCode, action });
  }

  get(code: string): { resourceCode: string; action: string } | undefined {
    return this.map.get(code);
  }

  has(code: string): boolean {
    return this.map.has(code);
  }

  clear(): void {
    this.map.clear();
  }

  entries(): IterableIterator<[string, { resourceCode: string; action: string }]> {
    return this.map.entries();
  }
}
