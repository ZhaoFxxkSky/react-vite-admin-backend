import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  GlobalExceptionFilter,
  TransformInterceptor,
  LoggingInterceptor,
  JwtGuard,
  PermissionsGuard,
  RequestIdMiddleware,
  DataScopeInterceptor,
  RedisService,
} from '@core';
import { Reflector } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import { SessionActivityInterceptor } from './interceptors/session-activity.interceptor';
import { SessionService } from './modules/session/session.service';

export function bootstrapApp(app: NestExpressApplication) {
  app.use((req: Request, res: Response, next: NextFunction) =>
    new RequestIdMiddleware().use(req, res, next),
  );

  const reflector = app.get(Reflector);
  const redisService = app.get(RedisService);
  app.useGlobalGuards(
    new JwtGuard(reflector, redisService),
    new PermissionsGuard(reflector),
  );

  const exceptionFilter = app.get(GlobalExceptionFilter);
  app.useGlobalFilters(exceptionFilter);

  const loggingInterceptor = app.get(LoggingInterceptor);
  const dataScopeInterceptor = app.get(DataScopeInterceptor);
  const sessionService = app.get(SessionService);
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    loggingInterceptor,
    dataScopeInterceptor,
    new SessionActivityInterceptor(sessionService),
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
