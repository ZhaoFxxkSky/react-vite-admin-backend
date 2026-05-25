import { Module } from '@nestjs/common';
import { IpFilterController } from './ip-filter.controller';
import { IpFilterService } from './ip-filter.service';
import { IpFilterGuard } from './guards/ip-filter.guard';

@Module({
  controllers: [IpFilterController],
  providers: [IpFilterService, IpFilterGuard],
  exports: [IpFilterService, IpFilterGuard],
})
export class IpFilterModule {}
