import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { loadYamlConfig } from './yaml-config.loader';
import { configSchema } from './config.schema';

@Module({})
export class ConfigModule {
  /**
   * 加载指定目录下的 YAML 配置。
   *
   * @param configDir 配置目录路径，相对于项目根目录
   * @example ConfigModule.forRoot('apps/user-service/config')
   */
  static forRoot(configDir: string): DynamicModule {
    return {
      module: ConfigModule,
      imports: [
        NestConfigModule.forRoot({
          isGlobal: true,
          load: [loadYamlConfig(configDir)],
        }),
      ],
    };
  }
}
