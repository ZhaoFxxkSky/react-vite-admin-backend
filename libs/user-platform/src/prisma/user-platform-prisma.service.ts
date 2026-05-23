import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService, createPrismaClient } from '@core';
import { getCurrentDataScope } from './data-scope.storage';

function createExtendedPrismaClient(): PrismaClient {
  const client = createPrismaClient();

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const ds = getCurrentDataScope();
          if (!ds || ds.isSuperAdmin || ds.scope === 'ALL') {
            return query(args);
          }

          // 只作用于配置的目标实体，避免对其他模型误注入条件
          if (ds.entityName && model !== ds.entityName) {
            return query(args);
          }

          const actions = [
            'findMany',
            'findFirst',
            'findFirstOrThrow',
            'findUnique',
            'findUniqueOrThrow',
            'count',
            'aggregate',
            'groupBy',
          ];
          if (!actions.includes(operation)) {
            return query(args);
          }

          const queryArgs = (args as any) || {};

          if (ds.scope === 'NONE') {
            queryArgs.where = { AND: [queryArgs.where || {}, { id: -1 }] };
            return query(queryArgs);
          }

          if (ds.scope === 'SELF' && ds.selfFieldPath) {
            queryArgs.where = {
              AND: [queryArgs.where || {}, { [ds.selfFieldPath]: ds.userId }],
            };
            return query(queryArgs);
          }

          if (
            ds.accessibleOrgIds &&
            ds.accessibleOrgIds.length > 0 &&
            ds.fieldPath
          ) {
            if (ds.relationPath) {
              queryArgs.where = {
                AND: [
                  queryArgs.where || {},
                  {
                    [ds.relationPath]: {
                      some: {
                        [ds.fieldPath]: { in: ds.accessibleOrgIds },
                      },
                    },
                  },
                ],
              };
            } else {
              queryArgs.where = {
                AND: [
                  queryArgs.where || {},
                  { [ds.fieldPath]: { in: ds.accessibleOrgIds } },
                ],
              };
            }
            return query(queryArgs);
          }

          queryArgs.where = { AND: [queryArgs.where || {}, { id: -1 }] };
          return query(queryArgs);
        },
      },
    },
  }) as unknown as PrismaClient;
}

@Injectable()
export class UserPlatformPrismaService extends PrismaService {
  constructor() {
    super();
    (this as any).client = createExtendedPrismaClient();
  }
}
