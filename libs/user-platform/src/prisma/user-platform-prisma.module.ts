import { Module, Global } from '@nestjs/common';
import { UserPlatformPrismaService } from './user-platform-prisma.service';

@Global()
@Module({
  providers: [UserPlatformPrismaService],
  exports: [UserPlatformPrismaService],
})
export class UserPlatformPrismaModule {}
