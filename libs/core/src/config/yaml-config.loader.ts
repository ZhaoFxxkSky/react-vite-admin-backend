import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { config as loadDotenv } from 'dotenv';
import { configSchema } from './config.schema';

function deepMerge(target: any, source: any): any {
  if (!source) return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function interpolateEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    const match = obj.match(/^\$\{([^}]+)\}$/);
    if (match) {
      const value = process.env[match[1]];
      return value !== undefined ? value : obj;
    }
    return obj.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
      const value = process.env[varName];
      return value !== undefined ? value : _match;
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = interpolateEnvVars(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * 加载 YAML 配置文件。
 *
 * 加载顺序（后覆盖前）：
 * 1. {configDir}/app.yml          基础配置（默认值）
 * 2. {configDir}/app.{NODE_ENV}.yml  环境覆盖（开发/生产）
 *
 * 支持语法：
 * - ${ENV_VAR}  引用环境变量（纯引用或字符串内插）
 */
export function loadYamlConfig(configDir: string): () => Record<string, any> {
  return () => {
    // 确保 .env 文件被加载到 process.env，这样 ${ENV_VAR} 才能解析
    loadDotenv();

    const env = process.env.NODE_ENV || 'development';
    const basePath = path.join(process.cwd(), configDir, 'app.yml');
    const envPath = path.join(process.cwd(), configDir, `app.${env}.yml`);

    let config: any = {};

    if (fs.existsSync(basePath)) {
      config = yaml.load(fs.readFileSync(basePath, 'utf8')) as any;
    }

    if (fs.existsSync(envPath)) {
      const envConfig = yaml.load(fs.readFileSync(envPath, 'utf8')) as any;
      config = deepMerge(config, envConfig);
    }

    const result = interpolateEnvVars(config);
    return configSchema.parse(result);
  };
}
