import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { ConfigRepository } from './infrastructure/repositories/config.repository';

@Module({
  imports: [],
  controllers: [ConfigController],
  providers: [ConfigService, ConfigRepository],
  exports: [ConfigService, ConfigRepository],
})
export class ConfigModule {}
