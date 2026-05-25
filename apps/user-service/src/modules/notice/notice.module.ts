import { Module } from '@nestjs/common';
import { NoticeAdminController, NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';

@Module({
  controllers: [NoticeAdminController, NoticeController],
  providers: [NoticeService],
})
export class NoticeModule {}
