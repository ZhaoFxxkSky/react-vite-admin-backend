import { AppLogger } from '../logger/app-logger.service';

export function LogMethod(context?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const self = this as any;
      const logger: AppLogger | undefined = self.logger;
      const logContext = context || `${className}.${propertyKey}`;
      const startTime = Date.now();

      const sanitizeArgs = () =>
        args.map((a) => {
          if (a === null || a === undefined) return a;
          if (typeof a === 'object') {
            // 脱敏：不记录 password 字段
            const clone = { ...a };
            if ('password' in clone) clone.password = '***';
            if ('token' in clone) clone.token = '***';
            return clone;
          }
          return a;
        });

      try {
        if (logger) {
          logger.info(`▶ ${logContext}`, {
            context: logContext,
            method: propertyKey,
            args: sanitizeArgs(),
          });
        }

        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        if (logger) {
          logger.info(`◀ ${logContext}  (${duration}ms)`, {
            context: logContext,
            method: propertyKey,
            duration,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        if (logger) {
          logger.error(`✖ ${logContext}  (${duration}ms)`, error, {
            context: logContext,
            method: propertyKey,
            duration,
            args: sanitizeArgs(),
          });
        }

        throw error;
      }
    };

    return descriptor;
  };
}
