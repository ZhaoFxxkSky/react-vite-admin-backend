import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import chalk from 'chalk';

const { combine, timestamp, json, errors, printf } = winston.format;

/* ── ANSI 辅助工具 ─────────────────────────────── */
const ANSI_REGEX = /\[\d+(;\d+)*m/g;
const stripAnsi = (str: string) => str.replace(ANSI_REGEX, '');
const padEndAnsi = (str: string, len: number) => {
  const visible = stripAnsi(str).length;
  return str + ' '.repeat(Math.max(0, len - visible));
};

/* ── 列宽常量 ──────────────────────────────────── */
const W_TIME = 15;      // [HH:mm:ss.SSS]
const W_LEVEL = 9;      // ● INFO
const W_CONTEXT = 18;   // [Bootstrap]

/* ── 级别配置（图标 + 颜色）─────────────────────── */
const LEVEL_CONFIG: Record<string, { icon: string; color: chalk.Chalk }> = {
  error: { icon: '✖', color: chalk.red },
  warn:  { icon: '▲', color: chalk.yellow },
  info:  { icon: '●', color: chalk.cyan },
  debug: { icon: '◆', color: chalk.gray },
  verbose: { icon: '◇', color: chalk.gray },
};

/**
 * Console 美化格式（开发环境可读）
 *
 * 设计要点：
 * 1. 时间戳灰色，不喧宾夺主
 * 2. 级别用图标 + 颜色，一眼区分
 * 3. 上下文品红，快速定位模块
 * 4. 元数据 / 错误用子行缩进对齐，形成视觉层级
 *
 * 示例输出：
 * [14:52:30.874] ● INFO  [Bootstrap]      Application is running
 *                                     { userId: 42, ttl: 300s }
 * [14:52:33.012] ✖ ERROR [UserService]    User creation failed
 *                                     { traceId: abc }
 *                                     → NotFoundException: User not found
 *                                       Error: User not found
 *                                         at UserService.findById (...)
 */
const consoleFormat = combine(
  timestamp({ format: 'HH:mm:ss.SSS' }),
  printf(({ level, message, timestamp, context, ...meta }) => {
    const cfg = LEVEL_CONFIG[level] || { icon: '○', color: chalk.white };

    // 时间戳（灰色）
    const timeStr = chalk.gray(padEndAnsi(`[${timestamp}]`, W_TIME));

    // 级别（图标 + 着色）
    const levelStr = cfg.color(padEndAnsi(`${cfg.icon} ${level.toUpperCase()}`, W_LEVEL));

    // 上下文（品红）
    const ctxStr = context
      ? chalk.magenta(padEndAnsi(`[${context}]`, W_CONTEXT))
      : ' '.repeat(W_CONTEXT);

    // 主行
    let output = `${timeStr} ${levelStr} ${ctxStr}  ${message}`;

    // 子行统一缩进（对齐到消息列）
    const indent = ' '.repeat(W_TIME + 1 + W_LEVEL + 1 + W_CONTEXT + 2);

    // ── 其余 meta 字段 ──
    const { errorName, errorMessage, stack, ...restMeta } = meta;
    const metaKeys = Object.keys(restMeta).filter(
      (k) =>
        !['level', 'message', 'timestamp'].includes(k) &&
        restMeta[k] !== undefined,
    );
    if (metaKeys.length > 0) {
      const pairs = metaKeys.map((k) => {
        const v = restMeta[k];
        if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`;
        return `${k}=${v}`;
      });
      output += `\n${indent}${chalk.gray('{ ' + pairs.join(', ') + ' }')}`;
    }

    // ── 错误详情 ──
    if (errorName) {
      output += `\n${indent}${chalk.red(`→ ${errorName}: ${errorMessage}`)}`;
    }
    if (stack) {
      const stackStr = Array.isArray(stack) ? stack.join('\n') : String(stack);
      const lines = stackStr.split('\n').slice(0, 6);
      const stackIndent = indent + '  ';
      const formatted = lines.join('\n' + stackIndent);
      output += `\n${stackIndent}${chalk.gray(formatted)}`;
    }

    return output;
  }),
);

/**
 * 文件日志格式（保持 JSON，便于 ELK/Filebeat 采集）
 */
const fileFormat = combine(timestamp(), json(), errors({ stack: true }));

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: fileFormat,
    }),
  ],
};
