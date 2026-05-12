import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ApiPermissionController } from './api-permission.controller';
import { ApiPermissionService } from './api-permission.service';
import { ApiPermissionScannerService } from './api-permission-scanner.service';

@Module({
  imports: [DiscoveryModule],
  controllers: [ApiPermissionController],
  providers: [ApiPermissionService, ApiPermissionScannerService],
  exports: [ApiPermissionService],
})
export class ApiPermissionModule {}
