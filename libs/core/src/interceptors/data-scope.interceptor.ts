import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { dataScopeALS, DataScopeContext } from '../prisma/data-scope.storage';
import { DataScopeUser, DataScopeAction } from '../data-scope/data-scope.types';
import { DataScopeCache } from '../data-scope/data-scope.cache';
import {
  API_PERMISSION_KEY,
  ApiPermissionMeta,
} from '../decorators/api-permission.decorator';

export { DataScopeContext } from '../prisma/data-scope.storage';

export interface IDataScopeResolver {
  resolve(
    user: DataScopeUser,
    resourceCode: string,
    action: DataScopeAction,
  ): Promise<DataScopeContext | null>;
}

export const DATA_SCOPE_RESOLVER = Symbol('DATA_SCOPE_RESOLVER');

@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private dataScopeCache: DataScopeCache,
    @Optional()
    @Inject(DATA_SCOPE_RESOLVER)
    private resolver: IDataScopeResolver | undefined,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as DataScopeUser | undefined;

    if (user?.isSuperAdmin) {
      return next.handle();
    }

    const apiMeta = this.reflector.getAllAndOverride<
      ApiPermissionMeta | undefined
    >(API_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!apiMeta?.code || !user?.id) {
      return next.handle();
    }

    const mapping = this.dataScopeCache.get(apiMeta.code);
    if (!mapping) {
      return next.handle();
    }

    let ds: DataScopeContext | null = null;

    if (this.resolver) {
      ds = await this.resolver.resolve(
        user,
        mapping.resourceCode,
        mapping.action as DataScopeAction,
      );
    }

    if (!ds) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      dataScopeALS.run(ds!, () => {
        const sub = next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
        return () => sub.unsubscribe();
      });
    });
  }
}
