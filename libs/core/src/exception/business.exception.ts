import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, code: number = HttpStatus.BAD_REQUEST) {
    super({ code, message }, code);
  }
}

export class UnauthorizedBusinessException extends BusinessException {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenBusinessException extends BusinessException {
  constructor(message = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundBusinessException extends BusinessException {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}
