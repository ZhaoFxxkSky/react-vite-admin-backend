import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DataScopeCache } from '../data-scope/data-scope.cache';

@Global()
@Module({
  providers: [PrismaService, DataScopeCache],
  exports: [PrismaService, DataScopeCache],
})
export class PrismaModule {}
