import { AuditEvent } from './audit-event.interface';

export interface IAuditLogger {
  log(event: AuditEvent): Promise<void>;
}

export const AUDIT_LOGGER_TOKEN = Symbol('AUDIT_LOGGER');
