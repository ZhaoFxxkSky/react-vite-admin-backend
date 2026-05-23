import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  GlobalExceptionFilter,
  TransformInterceptor,
  LoggingInterceptor,
  RequestIdMiddleware,
} from '@core';
import {
  JwtGuard,
  PermissionsGuard,
  DataScopeInterceptor,
} from '@app/user-platform';
import { Request, Response, NextFunction } from 'express';
import { SessionActivityInterceptor } from './interceptors/session-activity.interceptor';
import { CustomThrottlerGuard } from './modules/throttler/guards/custom-throttler.guard';
import { AuditLogInterceptor } from './modules/audit-log/audit-log.interceptor';

export function bootstrapApp(app: NestExpressApplication) {
  app.use((req: Request, res: Response, next: NextFunction) =>
    new RequestIdMiddleware().use(req, res, next),
  );

  app.useGlobalGuards(app.get(JwtGuard), app.get(PermissionsGuard), app.get(CustomThrottlerGuard));

  const exceptionFilter = app.get(GlobalExceptionFilter);
  app.useGlobalFilters(exceptionFilter);

  const loggingInterceptor = app.get(LoggingInterceptor);
  const dataScopeInterceptor = app.get(DataScopeInterceptor);
  app.useGlobalInterceptors(
    app.get(TransformInterceptor),
    loggingInterceptor,
    dataScopeInterceptor,
    app.get(SessionActivityInterceptor),
    app.get(AuditLogInterceptor),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix & versioning must be set BEFORE Swagger document creation
  // app.setGlobalPrefix('api');
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  //   prefix: 'v',
  // });

  const config = new DocumentBuilder()
    .setTitle('Data Space API')
    .setDescription('Enterprise-grade API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
