import { Module } from '@nestjs/common';
import { ThrottlerModule as NestThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';

@Module({
  imports: [
    NestThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  providers: [CustomThrottlerGuard],
  exports: [CustomThrottlerGuard],
})
export class ThrottlerModule {}
