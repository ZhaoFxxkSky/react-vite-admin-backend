import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@app/user-platform';
import { IpFilterService } from './ip-filter.service';

@ApiTags('IP 黑白名单')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('admin/ip-rules')
export class IpFilterController {
  constructor(private readonly ipFilterService: IpFilterService) {}

  @Get()
  async getRules(@Query('type') type?: 'white' | 'black') {
    return this.ipFilterService.getRules(type);
  }

  @Post()
  async addRule(
    @Body('ip') ip: string,
    @Body('type') type: 'white' | 'black',
    @Body('remark') remark?: string,
  ) {
    return this.ipFilterService.addRule(ip, type, remark);
  }

  @Delete(':id')
  async removeRule(@Param('id') id: string) {
    return this.ipFilterService.removeRule(Number(id));
  }
}
