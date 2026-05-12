import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { getCurrentDataScope } from './data-scope.storage';

function createExtendedPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const adapter = new PrismaMariaDb(connectionString);

  return new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const ds = getCurrentDataScope();
          if (
            !ds ||
            ds.isSuperAdmin ||
            ds.scope === 'ALL'
          ) {
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

          const queryArgs = args as any || {};

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
  });
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: ExtendedPrismaClient;
  $transaction: ExtendedPrismaClient['$transaction'];

  constructor() {
    this.client = createExtendedPrismaClient();
    this.$transaction = this.client.$transaction.bind(this.client) as any;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  get user() {
    return this.client.user;
  }
  get role() {
    return this.client.role;
  }
  get permission() {
    return this.client.permission;
  }
  get organization() {
    return this.client.organization;
  }
  get userRole() {
    return this.client.userRole;
  }
  get rolePermission() {
    return this.client.rolePermission;
  }
  get userOrganization() {
    return this.client.userOrganization;
  }
  get file() {
    return this.client.file;
  }
  get auditLog() {
    return this.client.auditLog;
  }
  get refreshToken() {
    return this.client.refreshToken;
  }
  get dataPermissionMeta() {
    return this.client.dataPermissionMeta;
  }
  get roleDataPermissionScope() {
    return this.client.roleDataPermissionScope;
  }
  get roleResourceConfig() {
    return this.client.roleResourceConfig;
  }
  get apiPermission() {
    return this.client.apiPermission;
  }
  get roleApiPermission() {
    return this.client.roleApiPermission;
  }

  $queryRaw(...args: any[]) {
    return (this.client.$queryRaw as any)(...args);
  }

  $queryRawUnsafe(...args: any[]) {
    return (this.client.$queryRawUnsafe as any)(...args);
  }

  $executeRaw(...args: any[]) {
    return (this.client.$executeRaw as any)(...args);
  }
}
