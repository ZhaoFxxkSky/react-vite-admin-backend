import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@app/user-platform';
import { MonitorService } from './monitor.service';

@ApiTags('系统监控')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('system')
  async getSystemStats() {
    return this.monitorService.getSystemStats();
  }

  @Get('database')
  async getDatabaseStats() {
    return this.monitorService.getDatabaseStats();
  }

  @Get('online')
  async getOnlineStats() {
    return this.monitorService.getOnlineStats();
  }

  @Get('api')
  async getApiStats() {
    return this.monitorService.getApiStats();
  }

  @Get('dashboard')
  async getDashboard() {
    const [system, database, online, api] = await Promise.all([
      this.monitorService.getSystemStats(),
      this.monitorService.getDatabaseStats(),
      this.monitorService.getOnlineStats(),
      this.monitorService.getApiStats(),
    ]);

    return {
      system,
      database,
      online,
      api,
      timestamp: new Date().toISOString(),
    };
  }
}
