/**
 * Advanced Security Service
 * Provides enhanced security features beyond core requirements
 */

import * as crypto from 'crypto';

import { Pool, RowDataPacket } from 'mysql2/promise';
import * as speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';

import { SimpleLogger } from '../utils/logger';

import { CryptographyService } from './CryptographyService';

// Enhanced security interfaces
interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SecurityRule {
  id: string;
  type: 'access' | 'authentication' | 'authorization' | 'audit';
  condition: string;
  action: 'allow' | 'deny' | 'require_mfa' | 'log';
  parameters: Record<string, unknown>;
}

interface ThreatDetection {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  timestamp: Date;
  source: string;
  status: 'active' | 'resolved' | 'investigating';
  mitigation: string[];
}

interface BiometricAuth {
  userId: string;
  biometricType: 'fingerprint' | 'face' | 'voice' | 'iris';
  template: string;
  confidence: number;
  enrolledAt: Date;
  lastUsed?: Date;
  enabled: boolean;
}

interface ZeroTrustPolicy {
  id: string;
  name: string;
  description: string;
  conditions: {
    userGroups: string[];
    resources: string[];
    timeConstraints: string[];
    locationConstraints: string[];
    deviceConstraints: string[];
  };
  actions: {
    requireMFA: boolean;
    restrictActions: string[];
    logAccess: boolean;
    riskThreshold: number;
  };
  enabled: boolean;
}

interface SecurityAuditLog {
  id: string;
  eventType: string;
  userId?: string;
  resourceId?: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  riskScore: number;
  metadata: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
}

// Function type for threat detectors with explicit parameters and return type
type ThreatDetector = (events: unknown[]) => {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  mitigation: string[];
} | null;

export class AdvancedSecurityService {
  private db: Pool;
  private logger: SimpleLogger;
  private cryptographyService: CryptographyService;
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private threatDetectors: Map<string, ThreatDetector> = new Map();
  private zeroTrustPolicies: Map<string, ZeroTrustPolicy> = new Map();

  constructor(db: Pool, logger: SimpleLogger, cryptographyService: CryptographyService) {
    this.db = db;
    this.logger = logger;
    this.cryptographyService = cryptographyService;

    this.initializeSecurityPolicies();
    this.initializeThreatDetectors();
    this.initializeZeroTrustPolicies();
  }

  /**
   * Initialize default security policies
   */
  private initializeSecurityPolicies(): void {
    const defaultPolicies: SecurityPolicy[] = [
      {
        id: 'default-access-policy',
        name: 'Default Access Policy',
        description: 'Basic access control policy',
        rules: [
          {
            id: 'rule-1',
            type: 'access',
            condition: 'user.authenticated === true',
            action: 'allow',
            parameters: {},
          },
        ],
        enabled: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'mfa-policy',
        name: 'Multi-Factor Authentication Policy',
        description: 'Requires MFA for sensitive operations',
        rules: [
          {
            id: 'rule-2',
            type: 'authentication',
            condition: 'action.sensitive === true',
            action: 'require_mfa',
            parameters: { methods: ['totp', 'biometric'] },
          },
        ],
        enabled: true,
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultPolicies.forEach(policy => {
      this.securityPolicies.set(policy.id, policy);
    });
  }

  /**
   * Initialize threat detection algorithms
   */
  private initializeThreatDetectors(): void {
    // Brute force detection
    this.threatDetectors.set('brute-force', (events: unknown[]) => {
      const failedLogins = events.filter((event: unknown) => {
        const eventData = event as Record<string, unknown>;
        return eventData.eventType === 'login_failed';
      });

      if (failedLogins.length >= 5) {
        return {
          type: 'brute-force',
          severity: 'high' as const,
          description: `${failedLogins.length} failed login attempts detected`,
          indicators: [
            `IP: ${(failedLogins[0] as Record<string, unknown>).ipAddress}`,
            `User: ${(failedLogins[0] as Record<string, unknown>).userId}`,
          ],
          mitigation: ['Block IP address', 'Lock user account', 'Enable CAPTCHA'],
        };
      }
      return null;
    });

    // Anomaly detection
    this.threatDetectors.set('anomaly', (events: unknown[]) => {
      const behavior = this.analyzeUserBehavior(events);

      if (behavior.anomalyScore > 0.8) {
        return {
          type: 'anomaly',
          severity: 'medium' as const,
          description: `Unusual user behavior detected (score: ${behavior.anomalyScore.toFixed(2)})`,
          indicators: [`Anomaly score: ${behavior.anomalyScore.toFixed(2)}`],
          mitigation: ['Require additional authentication', 'Monitor user activity'],
        };
      }
      return null;
    });
  }

  /**
   * Initialize Zero Trust policies
   */
  private initializeZeroTrustPolicies(): void {
    const defaultZeroTrustPolicy: ZeroTrustPolicy = {
      id: 'default-zero-trust',
      name: 'Default Zero Trust Policy',
      description: 'Never trust, always verify',
      conditions: {
        userGroups: ['all'],
        resources: ['all'],
        timeConstraints: ['business_hours'],
        locationConstraints: ['trusted_networks'],
        deviceConstraints: ['managed_devices'],
      },
      actions: {
        requireMFA: true,
        restrictActions: ['delete', 'export'],
        logAccess: true,
        riskThreshold: 0.7,
      },
      enabled: true,
    };

    this.zeroTrustPolicies.set(defaultZeroTrustPolicy.id, defaultZeroTrustPolicy);
  }

  /**
   * Enroll biometric authentication for a user
   */
  async enrollBiometric(
    userId: string,
    biometricType: 'fingerprint' | 'face' | 'voice' | 'iris',
    biometricData: Buffer
  ): Promise<{ success: boolean; qrCode?: string; secret?: string }> {
    try {
      // Generate biometric template (simplified - in production use specialized libraries)
      const template = crypto.createHash('sha256').update(biometricData).digest('hex');
      const encryptedTemplate = await this.cryptographyService.encryptData(template);

      const biometricAuth: BiometricAuth = {
        userId,
        biometricType,
        template: encryptedTemplate.encryptedData,
        confidence: 0.95, // Default confidence
        enrolledAt: new Date(),
        enabled: true,
      };

      // Store in database
      await this.db.execute(
        `INSERT INTO BIOMETRIC_AUTH (
          user_id, biometric_type, template, confidence, enrolled_at, last_used, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          biometricAuth.userId,
          biometricAuth.biometricType,
          biometricAuth.template,
          biometricAuth.confidence,
          biometricAuth.enrolledAt,
          biometricAuth.lastUsed,
          biometricAuth.enabled,
        ]
      );

      // Generate backup TOTP secret for fallback
      const secret = speakeasy.generateSecret({
        name: `EMR-${userId}`,
        issuer: 'Blockchain EMR',
      });

      // Generate QR code URL (simplified - in production use qrcode library)
      const qrCode = `data:image/svg+xml;base64,${Buffer.from('<svg></svg>').toString('base64')}`;

      this.logger.info('Biometric authentication enrolled', {
        userId,
        biometricType,
        timestamp: new Date(),
      });

      return {
        success: true,
        qrCode,
        secret: secret.base32,
      };
    } catch (error) {
      this.logger.error('Failed to enroll biometric authentication', {
        userId,
        biometricType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false };
    }
  }

  /**
   * Verify biometric authentication
   */
  async verifyBiometric(
    userId: string,
    biometricType: 'fingerprint' | 'face' | 'voice' | 'iris',
    biometricData: Buffer
  ): Promise<{ success: boolean; confidence: number }> {
    try {
      const [rows] = (await this.db.execute(
        'SELECT template FROM BIOMETRIC_AUTH WHERE user_id = ? AND biometric_type = ? AND enabled = true',
        [userId, biometricType]
      )) as [RowDataPacket[], unknown];

      if (rows.length === 0) {
        return { success: false, confidence: 0 };
      }

      const storedTemplate = this.cryptographyService.decryptData(rows[0]?.template);
      const currentTemplate = crypto.createHash('sha256').update(biometricData).digest('hex');

      // Simplified matching - in production use specialized biometric matching algorithms
      const similarity = this.calculateBiometricSimilarity(
        storedTemplate.toString(),
        currentTemplate
      );
      const threshold = 0.85;

      const success = similarity >= threshold;

      if (success) {
        // Update last used timestamp
        await this.db.execute(
          'UPDATE BIOMETRIC_AUTH SET last_used = ? WHERE user_id = ? AND biometric_type = ?',
          [new Date(), userId, biometricType]
        );
      }

      this.logger.info('Biometric verification attempt', {
        userId,
        biometricType,
        success,
        confidence: similarity,
        timestamp: new Date(),
      });

      return { success, confidence: similarity };
    } catch (error) {
      this.logger.error('Biometric verification failed', {
        userId,
        biometricType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, confidence: 0 };
    }
  }

  /**
   * Evaluate Zero Trust policy for access request
   */
  async evaluateZeroTrustAccess(
    userId: string,
    resourceId: string,
    action: string,
    context: {
      ipAddress: string;
      userAgent: string;
      timestamp: Date;
      deviceId?: string;
      location?: { country: string; city: string };
    }
  ): Promise<{
    allowed: boolean;
    requiresMFA: boolean;
    riskScore: number;
    policies: string[];
  }> {
    try {
      let overallRiskScore = 0;
      let requiresMFA = false;
      const appliedPolicies: string[] = [];

      // Evaluate each Zero Trust policy
      for (const policy of this.zeroTrustPolicies.values()) {
        if (!policy.enabled) continue;

        const evaluation = await this.evaluateZeroTrustPolicy(
          policy,
          userId,
          resourceId,
          action,
          context
        );

        if (evaluation.matches) {
          appliedPolicies.push(policy.id);
          overallRiskScore = Math.max(overallRiskScore, evaluation.riskScore);

          if (policy.actions.requireMFA) {
            requiresMFA = true;
          }
        }
      }

      const allowed = overallRiskScore < 0.8; // Risk threshold

      // Log access evaluation
      await this.logSecurityEvent({
        eventType: 'zero_trust_evaluation',
        userId,
        resourceId,
        action,
        result: allowed ? 'success' : 'blocked',
        riskScore: overallRiskScore,
        metadata: {
          requiresMFA,
          appliedPolicies,
          context,
        },
        timestamp: context.timestamp,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        allowed,
        requiresMFA,
        riskScore: overallRiskScore,
        policies: appliedPolicies,
      };
    } catch (error) {
      this.logger.error('Zero Trust evaluation failed', {
        userId,
        resourceId,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fail secure - deny access on error
      return {
        allowed: false,
        requiresMFA: true,
        riskScore: 1.0,
        policies: [],
      };
    }
  }

  /**
   * Detect security threats in real-time
   */
  async detectThreats(timeWindow: number = 3600000): Promise<ThreatDetection[]> {
    try {
      const threats: ThreatDetection[] = [];
      const cutoffTime = new Date(Date.now() - timeWindow);

      // Get recent security events
      const [rows] = (await this.db.execute(
        'SELECT * FROM SECURITY_AUDIT_LOG WHERE timestamp >= ? ORDER BY timestamp DESC',
        [cutoffTime]
      )) as [RowDataPacket[], unknown];

      const events = rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata ?? '{}'),
      }));

      // Run threat detection algorithms
      for (const [detectorName, detector] of this.threatDetectors.entries()) {
        try {
          const threat = detector(events);

          if (threat) {
            const threatDetection: ThreatDetection = {
              id: uuidv4(),
              type: threat.type,
              severity: threat.severity,
              description: threat.description,
              indicators: threat.indicators,
              timestamp: new Date(),
              source: `detector:${detectorName}`,
              status: 'active',
              mitigation: threat.mitigation,
            };

            threats.push(threatDetection);

            // Store threat detection
            await this.db.execute(
              `INSERT INTO THREAT_DETECTIONS (
                id, type, severity, description, indicators, timestamp, source, status, mitigation
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                threatDetection.id,
                threatDetection.type,
                threatDetection.severity,
                threatDetection.description,
                JSON.stringify(threatDetection.indicators),
                threatDetection.timestamp,
                threatDetection.source,
                threatDetection.status,
                JSON.stringify(threatDetection.mitigation),
              ]
            );
          }
        } catch (detectorError) {
          this.logger.warn(`Threat detector ${detectorName} failed`, {
            error: detectorError instanceof Error ? detectorError.message : 'Unknown error',
          });
        }
      }

      this.logger.info('Threat detection completed', {
        threatsDetected: threats.length,
        timeWindow,
        timestamp: new Date(),
      });

      return threats;
    } catch (error) {
      this.logger.error('Threat detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Log security event for audit trail
   */
  async logSecurityEvent(event: Omit<SecurityAuditLog, 'id'>): Promise<void> {
    try {
      const auditLog: SecurityAuditLog = {
        id: uuidv4(),
        ...event,
      };

      await this.db.execute(
        `INSERT INTO SECURITY_AUDIT_LOG (
          id, event_type, user_id, resource_id, action, result, risk_score,
          metadata, timestamp, ip_address, user_agent, geolocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditLog.id,
          auditLog.eventType,
          auditLog.userId,
          auditLog.resourceId,
          auditLog.action,
          auditLog.result,
          auditLog.riskScore,
          JSON.stringify(auditLog.metadata),
          auditLog.timestamp,
          auditLog.ipAddress,
          auditLog.userAgent,
          auditLog.geolocation ? JSON.stringify(auditLog.geolocation) : null,
        ]
      );
    } catch (error) {
      this.logger.error('Failed to log security event', {
        event: event.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Helper method to calculate biometric similarity
   */
  private calculateBiometricSimilarity(template1: string, template2: string): number {
    // Simplified similarity calculation - in production use specialized algorithms
    const length = Math.min(template1.length, template2.length);
    let matches = 0;

    for (let i = 0; i < length; i++) {
      if (template1[i] === template2[i]) {
        matches++;
      }
    }

    return matches / length;
  }

  /**
   * Helper method to analyze user behavior for anomaly detection
   */
  private analyzeUserBehavior(events: unknown[]): { anomalyScore: number } {
    // Simplified behavior analysis
    const patterns = {
      timeOfDay: this.analyzeTimePattern(events),
      accessFrequency: this.analyzeAccessFrequency(events),
      resourceAccess: this.analyzeResourcePattern(events),
    };

    const anomalyScore =
      (patterns.timeOfDay + patterns.accessFrequency + patterns.resourceAccess) / 3;
    return { anomalyScore };
  }

  private analyzeTimePattern(events: unknown[]): number {
    // Analyze if access times are unusual
    const accessTimes = events.map((event: unknown) => {
      const eventData = event as Record<string, unknown>;
      return new Date(eventData.timestamp as string).getHours();
    });
    const businessHours = accessTimes.filter(hour => hour >= 9 && hour <= 17).length;
    return 1 - businessHours / accessTimes.length;
  }

  private analyzeAccessFrequency(events: unknown[]): number {
    // Analyze access frequency patterns
    const timestamps = events.map((event: unknown) => {
      const eventData = event as Record<string, unknown>;
      return new Date(eventData.timestamp as string).getTime();
    });
    timestamps.sort((a, b) => a - b);

    const timeSpans: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const current = timestamps[i];
      const previous = timestamps[i - 1];
      if (current !== undefined && previous !== undefined) {
        timeSpans.push(current - previous);
      }
    }

    if (timeSpans.length === 0) return 0;
    const rapidAccess = timeSpans.filter(span => span < 60000).length; // Less than 1 minute
    return rapidAccess / timeSpans.length;
  }

  private analyzeResourcePattern(events: unknown[]): number {
    // Analyze resource access patterns
    const resources = events.map((event: unknown) => {
      const eventData = event as Record<string, unknown>;
      return eventData.resourceId;
    }).filter(Boolean);
    const uniqueResources = new Set(resources).size;

    // Higher score for accessing many different resources quickly
    return Math.min(uniqueResources / 10, 1);
  }

  /**
   * Helper method to evaluate Zero Trust policy
   */
  private async evaluateZeroTrustPolicy(
    policy: ZeroTrustPolicy,
    _userId: string,
    _resourceId: string,
    action: string,
    _context: unknown
  ): Promise<{ matches: boolean; riskScore: number }> {
    const matches = true;
    let riskScore = 0;

    // Check user groups (simplified - would check actual user groups)
    if (!policy.conditions.userGroups.includes('all')) {
      // In production, check if user belongs to specified groups
      riskScore += 0.2;
    }

    // Check time constraints
    if (policy.conditions.timeConstraints.includes('business_hours')) {
      const hour = new Date().getHours();
      if (hour < 9 || hour > 17) {
        riskScore += 0.3;
      }
    }

    // Check if action is restricted
    if (policy.actions.restrictActions.includes(action)) {
      riskScore += 0.4;
    }

    return { matches, riskScore };
  }
}

export default AdvancedSecurityService;
