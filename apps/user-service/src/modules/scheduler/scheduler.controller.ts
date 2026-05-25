import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@app/user-platform';
import { SchedulerService } from './scheduler.service';

@ApiTags('定时任务')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('tasks')
  async getTasks() {
    return [
      {
        name: 'cleanAuditLogs',
        description: '清理过期审计日志',
        cron: '0 3 * * *',
      },
      {
        name: 'cleanExpiredFiles',
        description: '清理过期文件',
        cron: '0 * * * *',
      },
    ];
  }
}
