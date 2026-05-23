import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SessionService } from '../modules/session/session.service';

@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  constructor(private readonly sessionService: SessionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const jti = request.user?.jti;

    if (jti) {
      this.sessionService.updateLastActiveByJti(jti).catch(() => {
        // silently ignore to avoid affecting normal requests
      });
    }

    return next.handle();
  }
}
