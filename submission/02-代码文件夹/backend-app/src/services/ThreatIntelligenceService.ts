/**
 * Threat Intelligence Service
 * Provides advanced threat detection and intelligence gathering
 */

import { Pool } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';

// Threat intelligence interfaces

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'user_agent';
  value: string;
  confidence: number;
  severity: SeverityLevel;
  source: string;
  description: string;
  tags: string[];
  firstSeen: Date;
  lastSeen: Date;
  active: boolean;
}

interface ThreatFeed {
  id: string;
  name: string;
  url: string;
  format: 'json' | 'xml' | 'csv' | 'stix';
  updateFrequency: number; // minutes
  lastUpdate: Date;
  enabled: boolean;
  apiKey?: string;
  indicators: ThreatIndicator[];
}

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'false_positive';
  category:
    | 'malware'
    | 'phishing'
    | 'data_breach'
    | 'unauthorized_access'
    | 'ddos'
    | 'insider_threat';
  indicators: string[];
  affectedSystems: string[];
  timeline: IncidentEvent[];
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

interface IncidentEvent {
  id: string;
  incidentId: string;
  timestamp: Date;
  eventType:
    | 'detection'
    | 'analysis'
    | 'containment'
    | 'eradication'
    | 'recovery'
    | 'lessons_learned';
  description: string;
  actor: string;
  evidence: string[];
}

interface ThreatHunt {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  query: string;
  dataSource: string[];
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  findings: ThreatHuntFinding[];
  hunter: string;
  startDate: Date;
  endDate?: Date;
}

interface ThreatHuntFinding {
  id: string;
  huntId: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  confidence: number;
  evidence: string[];
  indicators: string[];
  recommendations: string[];
  timestamp: Date;
}

interface AttackPattern {
  id: string;
  name: string;
  description: string;
  mitreId?: string; // MITRE ATT&CK ID
  tactics: string[];
  techniques: string[];
  indicators: string[];
  countermeasures: string[];
  severity: SeverityLevel;
  prevalence: number;
  lastSeen: Date;
}

export class ThreatIntelligenceService {
  private readonly db: Pool;
  private readonly _threatFeeds: Map<string, ThreatFeed> = new Map();
  private readonly _indicators: Map<string, ThreatIndicator> = new Map();
  private readonly _attackPatterns: Map<string, AttackPattern> = new Map();
  private readonly _updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(db: Pool) {
    this.db = db;
    this.initializeThreatFeeds();
    this.initializeAttackPatterns();
    this.startThreatFeedUpdates();
  }

  /**
   * Initialize threat intelligence feeds
   */
  private initializeThreatFeeds(): void {
    const defaultFeeds: ThreatFeed[] = [
      {
        id: 'feed-malware-domains',
        name: 'Malware Domain List',
        url: 'https://www.malwaredomainlist.com/hostslist/hosts.txt',
        format: 'csv',
        updateFrequency: 60, // 1 hour
        lastUpdate: new Date(),
        enabled: true,
        indicators: [],
      },
      {
        id: 'feed-abuse-ch',
        name: 'Abuse.ch Threat Intelligence',
        url: 'https://feodotracker.abuse.ch/downloads/ipblocklist.json',
        format: 'json',
        updateFrequency: 30, // 30 minutes
        lastUpdate: new Date(),
        enabled: true,
        indicators: [],
      },
    ];

    defaultFeeds.forEach(feed => {
      this._threatFeeds.set(feed.id, feed);
    });
  }

  /**
   * Initialize MITRE ATT&CK patterns
   */
  private initializeAttackPatterns(): void {
    const patterns: AttackPattern[] = [
      {
        id: 'T1078',
        name: 'Valid Accounts',
        description: 'Adversaries may obtain and abuse credentials of existing accounts',
        mitreId: 'T1078',
        tactics: ['Defense Evasion', 'Persistence', 'Privilege Escalation', 'Initial Access'],
        techniques: ['Domain Accounts', 'Local Accounts', 'Cloud Accounts'],
        indicators: [
          'Multiple failed login attempts',
          'Login from unusual locations',
          'Privilege escalation',
        ],
        countermeasures: [
          'Multi-factor authentication',
          'Account monitoring',
          'Privileged account management',
        ],
        severity: 'high',
        prevalence: 0.8,
        lastSeen: new Date(),
      },
      {
        id: 'T1566',
        name: 'Phishing',
        description: 'Adversaries may send phishing messages to gain access to victim systems',
        mitreId: 'T1566',
        tactics: ['Initial Access'],
        techniques: ['Spearphishing Attachment', 'Spearphishing Link', 'Spearphishing via Service'],
        indicators: ['Suspicious email attachments', 'Malicious URLs', 'Social engineering'],
        countermeasures: ['Email filtering', 'User training', 'URL analysis'],
        severity: 'high',
        prevalence: 0.9,
        lastSeen: new Date(),
      },
    ];

    patterns.forEach(pattern => {
      this._attackPatterns.set(pattern.id, pattern);
    });
  }

  /**
   * Start automatic threat feed updates
   */
  private startThreatFeedUpdates(): void {
    for (const feed of this._threatFeeds.values()) {
      if (feed.enabled) {
        const interval = setInterval(
          () => {
            void this.updateThreatFeed(feed.id);
          },
          feed.updateFrequency * 60 * 1000
        );
        this._updateIntervals.set(feed.id, interval);
      }
    }
  }

  /**
   * Update threat feed data
   */
  async updateThreatFeed(feedId: string): Promise<void> {
    try {
      const feed = this._threatFeeds.get(feedId);
      if (!feed?.enabled) return;

      logger.info('Updating threat feed', { feedId, feedName: feed.name });

      // Simulate threat feed update (in production, fetch from actual feeds)
      const mockIndicators: ThreatIndicator[] = [
        {
          id: uuidv4(),
          type: 'ip',
          value: '192.168.1.100',
          confidence: 0.8,
          severity: 'medium',
          source: feed.name,
          description: 'Suspicious IP address',
          tags: ['malware', 'botnet'],
          firstSeen: new Date(),
          lastSeen: new Date(),
          active: true,
        },
        {
          id: uuidv4(),
          type: 'domain',
          value: 'malicious-domain.com',
          confidence: 0.9,
          severity: 'high',
          source: feed.name,
          description: 'Known malware C&C domain',
          tags: ['c2', 'malware'],
          firstSeen: new Date(),
          lastSeen: new Date(),
          active: true,
        },
      ];

      // Store indicators
      for (const indicator of mockIndicators) {
        await this.storeIndicator(indicator);
        this._indicators.set(indicator.id, indicator);
      }

      feed.lastUpdate = new Date();
      feed.indicators = mockIndicators;

      logger.info('Threat feed updated successfully', {
        feedId,
        indicatorsCount: mockIndicators.length,
      });
    } catch (error) {
      logger.error('Failed to update threat feed', {
        error: error instanceof Error ? error.message : String(error),
        feedId,
      });
    }
  }

  /**
   * Check if an indicator matches known threats
   */
  async checkThreatIndicator(
    type: 'ip' | 'domain' | 'hash' | 'url' | 'email',
    value: string
  ): Promise<{
    isThreat: boolean;
    indicators: ThreatIndicator[];
    riskScore: number;
  }> {
    try {
      const [rows] = await this.db.execute<RowDataPacket[]>(
        'SELECT * FROM THREAT_INDICATORS WHERE type = ? AND value = ? AND active = true',
        [type, value]
      );

      const indicators: ThreatIndicator[] = rows.map(row => ({
        id: row.id,
        type: row.type,
        value: row.value,
        confidence: row.confidence,
        severity: row.severity,
        source: row.source,
        description: row.description,
        tags: JSON.parse(row.tags ?? '[]'),
        firstSeen: new Date(row.first_seen),
        lastSeen: new Date(row.last_seen),
        active: row.active,
      }));

      const isThreat = indicators.length > 0;
      const riskScore =
        indicators.length > 0
          ? Math.max(...indicators.map(i => i.confidence * this.getSeverityWeight(i.severity)))
          : 0;

      if (isThreat) {
        logger.warn('Threat indicator detected', {
          type,
          value,
          indicatorsCount: indicators.length,
          riskScore,
        });
      }

      return {
        isThreat,
        indicators,
        riskScore,
      };
    } catch (error) {
      logger.error('Failed to check threat indicator', {
        error: error instanceof Error ? error.message : String(error),
        type,
        value,
      });
      return {
        isThreat: false,
        indicators: [],
        riskScore: 0,
      };
    }
  }

  /**
   * Create security incident
   */
  async createSecurityIncident(
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    category:
      | 'malware'
      | 'phishing'
      | 'data_breach'
      | 'unauthorized_access'
      | 'ddos'
      | 'insider_threat',
    indicators: string[],
    affectedSystems: string[],
    assignedTo: string
  ): Promise<SecurityIncident> {
    try {
      const incident: SecurityIncident = {
        id: uuidv4(),
        title,
        description,
        severity,
        status: 'open',
        category,
        indicators,
        affectedSystems,
        timeline: [],
        assignedTo,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create initial event
      const initialEvent: IncidentEvent = {
        id: uuidv4(),
        incidentId: incident.id,
        timestamp: new Date(),
        eventType: 'detection',
        description: 'Incident created and assigned for investigation',
        actor: 'System',
        evidence: [],
      };

      incident.timeline.push(initialEvent);

      // Store incident
      await this.storeSecurityIncident(incident);

      logger.info('Security incident created', {
        incidentId: incident.id,
        title,
        severity,
        category,
        assignedTo,
      });

      return incident;
    } catch (error) {
      logger.error('Failed to create security incident', {
        error: error instanceof Error ? error.message : String(error),
        title,
        severity,
      });
      throw error;
    }
  }

  /**
   * Conduct threat hunting
   */
  async conductThreatHunt(
    name: string,
    description: string,
    hypothesis: string,
    query: string,
    dataSource: string[],
    hunter: string
  ): Promise<ThreatHunt> {
    try {
      const hunt: ThreatHunt = {
        id: uuidv4(),
        name,
        description,
        hypothesis,
        query,
        dataSource,
        status: 'active',
        findings: [],
        hunter,
        startDate: new Date(),
      };

      // Execute hunt query (simplified simulation)
      const findings = await this.executeThreatHuntQuery(hunt);
      hunt.findings = findings;

      if (findings.length > 0) {
        hunt.status = 'completed';
        hunt.endDate = new Date();

        // Create incidents for high-severity findings
        for (const finding of findings) {
          if (finding.severity === 'high' || finding.severity === 'critical') {
            await this.createSecurityIncident(
              `Threat Hunt Finding: ${finding.title}`,
              finding.description,
              finding.severity,
              'unauthorized_access',
              finding.indicators,
              [],
              hunter
            );
          }
        }
      }

      // Store hunt
      await this.storeThreatHunt(hunt);

      logger.info('Threat hunt completed', {
        huntId: hunt.id,
        name,
        findingsCount: findings.length,
        hunter,
      });

      return hunt;
    } catch (error) {
      logger.error('Failed to conduct threat hunt', {
        error: error instanceof Error ? error.message : String(error),
        name,
        hunter,
      });
      throw error;
    }
  }

  /**
   * Get threat intelligence summary
   */
  async getThreatIntelligenceSummary(): Promise<{
    totalIndicators: number;
    activeThreats: number;
    recentIncidents: number;
    threatScore: number;
    topThreats: { type: string; count: number }[];
  }> {
    try {
      const [indicatorRows] = await this.db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM THREAT_INDICATORS WHERE active = true'
      );

      const [incidentRows] = await this.db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM SECURITY_INCIDENTS WHERE status IN ("open", "investigating") AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
      );

      const [threatTypeRows] = await this.db.execute<RowDataPacket[]>(
        'SELECT type, COUNT(*) as count FROM THREAT_INDICATORS WHERE active = true GROUP BY type ORDER BY count DESC LIMIT 5'
      );

      const totalIndicators = (indicatorRows[0] as RowDataPacket)?.count ?? 0;
      const recentIncidents = (incidentRows[0] as RowDataPacket)?.count ?? 0;
      const activeThreats = Math.floor(totalIndicators * 0.1); // Estimate 10% are active threats

      // Calculate threat score based on indicators and incidents
      const threatScore = Math.min(100, activeThreats * 2 + recentIncidents * 10);

      const topThreats = threatTypeRows.map(row => ({
        type: row.type,
        count: row.count,
      }));

      return {
        totalIndicators,
        activeThreats,
        recentIncidents,
        threatScore,
        topThreats,
      };
    } catch (error) {
      logger.error('Failed to get threat intelligence summary', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Helper method to get severity weight
   */
  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical':
        return 1.0;
      case 'high':
        return 0.8;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.4;
      default:
        return 0.2;
    }
  }

  /**
   * Execute threat hunt query (simplified simulation)
   */
  private async executeThreatHuntQuery(hunt: ThreatHunt): Promise<ThreatHuntFinding[]> {
    // Simulate threat hunt execution
    const findings: ThreatHuntFinding[] = [];

    // Mock finding based on hypothesis
    if (hunt.hypothesis.toLowerCase().includes('unauthorized')) {
      findings.push({
        id: uuidv4(),
        huntId: hunt.id,
        title: 'Suspicious Login Pattern',
        description: 'Multiple failed login attempts from unusual IP addresses',
        severity: 'medium',
        confidence: 0.7,
        evidence: ['Login logs', 'IP geolocation data'],
        indicators: ['192.168.1.100', 'unusual_login_time'],
        recommendations: ['Block suspicious IPs', 'Enable additional monitoring'],
        timestamp: new Date(),
      });
    }

    return findings;
  }

  /**
   * Store threat indicator in database
   */
  private async storeIndicator(indicator: ThreatIndicator): Promise<void> {
    try {
      await this.db.execute(
        `INSERT INTO THREAT_INDICATORS (
          id, type, value, confidence, severity, source, description,
          tags, first_seen, last_seen, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          confidence = VALUES(confidence),
          severity = VALUES(severity),
          last_seen = VALUES(last_seen),
          active = VALUES(active)`,
        [
          indicator.id,
          indicator.type,
          indicator.value,
          indicator.confidence,
          indicator.severity,
          indicator.source,
          indicator.description,
          JSON.stringify(indicator.tags),
          indicator.firstSeen,
          indicator.lastSeen,
          indicator.active,
        ]
      );
    } catch (error) {
      logger.error('Failed to store threat indicator', {
        error: error instanceof Error ? error.message : String(error),
        indicatorId: indicator.id,
      });
    }
  }

  /**
   * Store security incident in database
   */
  private async storeSecurityIncident(incident: SecurityIncident): Promise<void> {
    try {
      await this.db.execute(
        `INSERT INTO SECURITY_INCIDENTS (
          id, title, description, severity, status, category, indicators,
          affected_systems, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          incident.id,
          incident.title,
          incident.description,
          incident.severity,
          incident.status,
          incident.category,
          JSON.stringify(incident.indicators),
          JSON.stringify(incident.affectedSystems),
          incident.assignedTo,
          incident.createdAt,
          incident.updatedAt,
        ]
      );

      // Store timeline events
      for (const event of incident.timeline) {
        await this.db.execute(
          `INSERT INTO INCIDENT_EVENTS (
            id, incident_id, timestamp, event_type, description, actor, evidence
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            event.id,
            event.incidentId,
            event.timestamp,
            event.eventType,
            event.description,
            event.actor,
            JSON.stringify(event.evidence),
          ]
        );
      }
    } catch (error) {
      logger.error('Failed to store security incident', {
        error: error instanceof Error ? error.message : String(error),
        incidentId: incident.id,
      });
    }
  }

  /**
   * Store threat hunt in database
   */
  private async storeThreatHunt(hunt: ThreatHunt): Promise<void> {
    try {
      await this.db.execute(
        `INSERT INTO THREAT_HUNTS (
          id, name, description, hypothesis, query, data_source,
          status, hunter, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          hunt.id,
          hunt.name,
          hunt.description,
          hunt.hypothesis,
          hunt.query,
          JSON.stringify(hunt.dataSource),
          hunt.status,
          hunt.hunter,
          hunt.startDate,
          hunt.endDate,
        ]
      );

      // Store findings
      for (const finding of hunt.findings) {
        await this.db.execute(
          `INSERT INTO THREAT_HUNT_FINDINGS (
            id, hunt_id, title, description, severity, confidence,
            evidence, indicators, recommendations, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finding.id,
            finding.huntId,
            finding.title,
            finding.description,
            finding.severity,
            finding.confidence,
            JSON.stringify(finding.evidence),
            JSON.stringify(finding.indicators),
            JSON.stringify(finding.recommendations),
            finding.timestamp,
          ]
        );
      }
    } catch (error) {
      logger.error('Failed to store threat hunt', {
        error: error instanceof Error ? error.message : String(error),
        huntId: hunt.id,
      });
    }
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    for (const interval of this._updateIntervals.values()) {
      clearInterval(interval);
    }
    this._updateIntervals.clear();
  }
}

export default ThreatIntelligenceService;
