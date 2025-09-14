import logger from '../utils/logger';

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: string;
  details: unknown;
}

export class SecurityMonitor {
  private events: SecurityEvent[] = [];

  constructor() {
    logger.info('SecurityMonitor initialized');
  }

  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.events.push(securityEvent);
    logger.info('Security event logged', { event: securityEvent });
  }

  getEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export default SecurityMonitor;
