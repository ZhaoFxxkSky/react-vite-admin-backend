export interface AuditEvent {
  serviceName: string;
  eventType: 'http' | 'business';
  userId?: number | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  duration?: number | null;
  metadata?: Record<string, unknown> | null;
  timestamp: Date;
}
