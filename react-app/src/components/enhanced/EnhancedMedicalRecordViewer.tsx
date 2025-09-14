/**
 * Enhanced Medical Record Viewer Component
 * Provides comprehensive medical record visualization with FHIR compliance
 */

import {
  ExpandMore,
  Person,
  Medication,
  Security,
  Download,
  Share,
  Edit,
  Visibility,
  VerifiedUser,
  Warning,
  CheckCircle,
  Favorite,
  Assessment,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@mui/material';
import { Timeline } from 'antd';
import React, { useState, useEffect, useCallback } from 'react';

// Enhanced interfaces for medical record data
export interface PatientInfo {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType: string;
  allergies: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
}

export interface VitalSigns {
  timestamp: string;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight: number;
  height: number;
  bmi: number;
}

export interface MedicalRecord {
  id: string;
  patient: PatientInfo;
  visitDate: string;
  provider: {
    name: string;
    specialty: string;
    npi: string;
  };
  facility: {
    name: string;
    address: string;
  };
  chiefComplaint: string;
  diagnosis: {
    primary: string;
    secondary: string[];
    icdCodes: string[];
  };
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate?: string;
    prescriber: string;
  }[];
  procedures: {
    name: string;
    date: string;
    provider: string;
    cptCode: string;
    notes: string;
  }[];
  labResults: {
    testName: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: 'normal' | 'abnormal' | 'critical';
    date: string;
  }[];
  vitalSigns: VitalSigns[];
  notes: string;
  attachments: {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadDate: string;
  }[];
  blockchainHash: string;
  fhirCompliant: boolean;
  encryptionStatus: 'encrypted' | 'decrypted';
  accessLog: {
    userId: string;
    userName: string;
    action: string;
    timestamp: string;
    ipAddress: string;
  }[];
}

interface EnhancedMedicalRecordViewerProps {
  recordId: string;
  onClose?: () => void;
  readOnly?: boolean;
}

const EnhancedMedicalRecordViewer: React.FC<EnhancedMedicalRecordViewerProps> = ({
  recordId,
  onClose,
  readOnly = false,
}) => {

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  const [showAccessLog, setShowAccessLog] = useState(false);


  const loadMedicalRecord = useCallback(async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - replace with actual API call
      const mockRecord: MedicalRecord = {
        id: recordId,
        patient: {
          id: 'patient-123',
          name: 'John Doe',
          dateOfBirth: '1985-03-15',
          gender: 'male',
          bloodType: 'O+',
          allergies: ['Penicillin', 'Shellfish'],
          emergencyContact: {
            name: 'Jane Doe',
            relationship: 'Spouse',
            phone: '+1-555-0123',
          },
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
          },
          insurance: {
            provider: 'Blue Cross Blue Shield',
            policyNumber: 'BC123456789',
            groupNumber: 'GRP001',
          },
        },
        visitDate: '2024-01-15T10:30:00Z',
        provider: {
          name: 'Dr. Sarah Johnson',
          specialty: 'Internal Medicine',
          npi: '1234567890',
        },
        facility: {
          name: 'General Hospital',
          address: '456 Hospital Ave, Anytown, CA 12345',
        },
        chiefComplaint: 'Chest pain and shortness of breath',
        diagnosis: {
          primary: 'Acute myocardial infarction',
          secondary: ['Hypertension', 'Type 2 diabetes'],
          icdCodes: ['I21.9', 'I10', 'E11.9'],
        },
        medications: [
          {
            name: 'Metoprolol',
            dosage: '50mg',
            frequency: 'Twice daily',
            startDate: '2024-01-15',
            prescriber: 'Dr. Sarah Johnson',
          },
          {
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Once daily',
            startDate: '2024-01-15',
            prescriber: 'Dr. Sarah Johnson',
          },
        ],
        procedures: [
          {
            name: 'Cardiac catheterization',
            date: '2024-01-15',
            provider: 'Dr. Michael Chen',
            cptCode: '93458',
            notes: 'Successful PCI with stent placement',
          },
        ],
        labResults: [
          {
            testName: 'Troponin I',
            value: '15.2',
            unit: 'ng/mL',
            referenceRange: '< 0.04',
            status: 'critical',
            date: '2024-01-15T08:00:00Z',
          },
          {
            testName: 'Total Cholesterol',
            value: '245',
            unit: 'mg/dL',
            referenceRange: '< 200',
            status: 'abnormal',
            date: '2024-01-15T08:00:00Z',
          },
        ],
        vitalSigns: [
          {
            timestamp: '2024-01-15T10:30:00Z',
            bloodPressure: { systolic: 140, diastolic: 90 },
            heartRate: 85,
            temperature: 98.6,
            respiratoryRate: 18,
            oxygenSaturation: 98,
            weight: 180,
            height: 70,
            bmi: 25.8,
          },
        ],
        notes:
          'Patient presented with acute chest pain. EKG showed ST elevation. Emergency cardiac catheterization performed with successful stent placement.',
        attachments: [
          {
            id: 'att-1',
            name: 'EKG_Results.pdf',
            type: 'application/pdf',
            size: 1024000,
            uploadDate: '2024-01-15T11:00:00Z',
          },
        ],
        blockchainHash: '0x1234567890abcdef...',
        fhirCompliant: true,
        encryptionStatus: 'encrypted',
        accessLog: [
          {
            userId: 'user-123',
            userName: 'Dr. Sarah Johnson',
            action: 'VIEW',
            timestamp: '2024-01-15T10:30:00Z',
            ipAddress: '192.168.1.100',
          },
        ],
      };

      setRecord(mockRecord);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load medical record:', error);
      setLoading(false);
    }
  }, [recordId]);

  // Load medical record data
  useEffect(() => {
    loadMedicalRecord();
  }, [loadMedicalRecord]);

  // Handle section expansion
  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Render patient overview
  const renderPatientOverview = () => {
    if (!record) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
              <Person fontSize="large" />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h5" component="div" fontWeight="bold">
                {record.patient.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                DOB: {new Date(record.patient.dateOfBirth).toLocaleDateString()} • Gender:{' '}
                {record.patient.gender} • Blood Type: {record.patient.bloodType}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <Chip
                  icon={<VerifiedUser />}
                  label={record.fhirCompliant ? 'FHIR Compliant' : 'Non-FHIR'}
                  color={record.fhirCompliant ? 'success' : 'warning'}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  icon={<Security />}
                  label={record.encryptionStatus === 'encrypted' ? 'Encrypted' : 'Decrypted'}
                  color={record.encryptionStatus === 'encrypted' ? 'success' : 'info'}
                  size="small"
                />
              </Box>
            </Box>
            <Box display="flex" flexDirection="column" gap={1}>
              <Button variant="outlined" startIcon={<Download />} size="small" disabled={readOnly}>
                Export
              </Button>
              <Button variant="outlined" startIcon={<Share />} size="small" disabled={readOnly}>
                Share
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Emergency Contact
              </Typography>
              <Typography variant="body2">
                {record.patient.emergencyContact.name} (
                {record.patient.emergencyContact.relationship})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {record.patient.emergencyContact.phone}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Address
              </Typography>
              <Typography variant="body2">{record.patient.address.street}</Typography>
              <Typography variant="body2">
                {record.patient.address.city}, {record.patient.address.state}{' '}
                {record.patient.address.zipCode}
              </Typography>
            </Grid>
          </Grid>

          {record.patient.allergies.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Allergies
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {record.patient.allergies.map(allergy => (
                  <Chip
                    key={allergy}
                    label={allergy}
                    color="error"
                    variant="outlined"
                    size="small"
                    icon={<Warning />}
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render vital signs
  const renderVitalSigns = () => {
    if (!record?.vitalSigns.length) return null;

    const latestVitals = record.vitalSigns[record.vitalSigns.length - 1];

    return (
      <Accordion
        expanded={expandedSections.includes('vitals')}
        onChange={() => handleSectionToggle('vitals')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center">
            <Favorite sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="h6">Vital Signs</Typography>
            <Chip label="Latest" size="small" color="primary" sx={{ ml: 2 }} />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {latestVitals.bloodPressure.systolic}/{latestVitals.bloodPressure.diastolic}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Blood Pressure (mmHg)
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {latestVitals.heartRate}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Heart Rate (bpm)
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {latestVitals.temperature}°F
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Temperature
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {latestVitals.oxygenSaturation}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  O2 Saturation
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {latestVitals.weight} lbs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Weight
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {latestVitals.bmi}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  BMI
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  // Render medications
  const renderMedications = () => {
    if (!record?.medications.length) return null;

    return (
      <Accordion
        expanded={expandedSections.includes('medications')}
        onChange={() => handleSectionToggle('medications')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center">
            <Medication sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6">Medications</Typography>
            <Badge badgeContent={record.medications.length} color="primary" sx={{ ml: 2 }}>
              <Chip label="Active" size="small" />
            </Badge>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {record.medications.map(medication => (
              <ListItem key={`${medication.name}-${medication.startDate}`} divider>
                <ListItemIcon>
                  <Medication color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {medication.name}
                      </Typography>
                      <Chip label={medication.dosage} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2">Frequency: {medication.frequency}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Prescribed by: {medication.prescriber} • Started:{' '}
                        {new Date(medication.startDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  };

  // Render lab results
  const renderLabResults = () => {
    if (!record?.labResults.length) return null;

    return (
      <Accordion
        expanded={expandedSections.includes('labs')}
        onChange={() => handleSectionToggle('labs')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center">
            <Assessment sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="h6">Laboratory Results</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {record.labResults.map(result => (
              <ListItem key={`${result.testName}-${result.date}`} divider>
                <ListItemIcon>
                  {result.status === 'critical' ? (
                    <Warning color="error" />
                  ) : result.status === 'abnormal' ? (
                    <Warning color="warning" />
                  ) : (
                    <CheckCircle color="success" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight="bold">
                        {result.testName}
                      </Typography>
                      <Chip
                        label={result.status.toUpperCase()}
                        color={
                          result.status === 'critical'
                            ? 'error'
                            : result.status === 'abnormal'
                              ? 'warning'
                              : 'success'
                        }
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="h6" component="span" color="primary">
                        {result.value} {result.unit}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Reference Range: {result.referenceRange} • Date:{' '}
                        {new Date(result.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading medical record...</Typography>
      </Box>
    );
  }

  if (!record) {
    return (
      <Box p={3}>
        <Typography color="error">Failed to load medical record</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Medical Record
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            onClick={() => setShowAccessLog(true)}
          >
            Access Log
          </Button>
          {!readOnly && (
            <Button variant="contained" startIcon={<Edit />}>
              Edit Record
            </Button>
          )}
        </Box>
      </Box>

      {/* Patient Overview */}
      {renderPatientOverview()}

      {/* Medical Information Sections */}
      {renderVitalSigns()}
      {renderMedications()}
      {renderLabResults()}

      {/* Access Log Dialog */}
      <Dialog open={showAccessLog} onClose={() => setShowAccessLog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Access Log</DialogTitle>
        <DialogContent>
          <Timeline mode="left">
            {record.accessLog.map(log => (
              <Timeline.Item
                key={`${log.userId}-${log.timestamp}`}
                label={new Date(log.timestamp).toLocaleString()}
                color="blue"
              >
                <Typography variant="subtitle2">
                  {log.action} by {log.userName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  IP: {log.ipAddress}
                </Typography>
              </Timeline.Item>
            ))}
          </Timeline>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccessLog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedMedicalRecordViewer;
