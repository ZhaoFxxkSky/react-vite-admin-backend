import { Module } from '@nestjs/common';
import { DictService } from './dict.service';
import { DictController } from './dict.controller';
import { DictTypeRepository } from './infrastructure/repositories/dict-type.repository';
import { DictDataRepository } from './infrastructure/repositories/dict-data.repository';

@Module({
  imports: [],
  controllers: [DictController],
  providers: [DictService, DictTypeRepository, DictDataRepository],
  exports: [DictService, DictTypeRepository, DictDataRepository],
})
export class DictModule {}
