/**
 * Enhanced UI/UX Components Index
 * Exports all enhanced components for the blockchain EMR system
 */

export { default as EnhancedDashboard } from './EnhancedDashboard';
export { default as EnhancedMedicalRecordViewer } from './EnhancedMedicalRecordViewer';
export { default as EnhancedSearchInterface } from './EnhancedSearchInterface';
export { default as EnhancedAnalyticsDashboard } from './EnhancedAnalyticsDashboard';
export { default as EnhancedSecurityMonitor } from './EnhancedSecurityMonitor';

// Re-export types for external use
export type {
  DashboardMetrics,
  ActivityData,
  SecurityAlert,
} from './EnhancedDashboard';

export type { PatientInfo, VitalSigns, MedicalRecord } from './EnhancedMedicalRecordViewer';

export type {
  SearchFilters,
  SearchResult,
  SavedSearch,
  SearchStats,
} from './EnhancedSearchInterface';

export type {
  MLInsight,
  AnalyticsMetrics,
  TrendData,
  PredictiveAnalysis,
} from './EnhancedAnalyticsDashboard';

export type {
  SecurityMetrics,
  SecurityAlert as SecurityAlertType,
  AccessLog,
  ThreatIntelligence,
  SecurityTrend,
} from './EnhancedSecurityMonitor';
