import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  recordType: string;
  department: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  attachments: UploadedFile[];
  createdAt: string;
  status: 'active' | 'draft' | 'archived';
  doctorName: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  ipfsHash?: string;
  status: 'uploading' | 'completed' | 'failed';
  progress: number;
  url?: string;
}

export interface Medication {
  id: string;
  name: string;
  specification: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  diagnosis: string;
  medications: Medication[];
  doctorAdvice: string;
  createdAt: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  doctorName: string;
}

interface MedicalRecordContextType {
  medicalRecords: MedicalRecord[];
  uploadedFiles: UploadedFile[];
  prescriptions: Prescription[];
  addMedicalRecord: (record: MedicalRecord) => void;
  updateMedicalRecord: (id: string, record: Partial<MedicalRecord>) => void;
  deleteMedicalRecord: (id: string) => void;
  getMedicalRecord: (id: string) => MedicalRecord | undefined;
  addUploadedFile: (file: UploadedFile) => void;
  updateUploadedFile: (id: string, file: Partial<UploadedFile>) => void;
  deleteUploadedFile: (id: string) => void;
  getUploadedFile: (id: string) => UploadedFile | undefined;
  addPrescription: (prescription: Prescription) => void;
  updatePrescription: (id: string, updatedPrescription: Partial<Prescription>) => void;
  deletePrescription: (id: string) => void;
  getPrescription: (id: string) => Prescription | undefined;
}

const MedicalRecordContext = createContext<MedicalRecordContextType | undefined>(undefined);

export const useMedicalRecord = () => {
  const context = useContext(MedicalRecordContext);
  if (!context) {
    throw new Error('useMedicalRecord must be used within a MedicalRecordProvider');
  }
  return context;
};

interface MedicalRecordProviderProps {
  children: ReactNode;
}

// 从localStorage加载数据的辅助函数
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// 保存到localStorage的辅助函数
const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

export const MedicalRecordProvider: React.FC<MedicalRecordProviderProps> = ({ children }) => {
  // 初始化示例数据
  const initialMedicalRecords: MedicalRecord[] = [
    {
      id: 'MR001',
      patientId: 'P001234',
      patientName: '张三',
      patientAge: 45,
      recordType: '诊断报告',
      department: '心内科',
      chiefComplaint: '胸痛、气短',
      presentIllness: '患者2天前开始出现胸痛，伴有气短，活动后加重',
      pastHistory: '高血压病史5年',
      physicalExam: '血压150/90mmHg，心率92次/分，心律齐',
      diagnosis: '冠心病，心绞痛',
      treatment: '硝酸甘油舌下含服，阿司匹林抗血小板聚集',
      notes: '建议进一步行冠脉造影检查',
      attachments: [],
      createdAt: '2024-01-15',
      status: 'active',
      doctorName: '李医生',
    },
    {
      id: 'MR002',
      patientId: 'P001235',
      patientName: '李四',
      patientAge: 38,
      recordType: '检查报告',
      department: '内科',
      chiefComplaint: '发热、咳嗽',
      presentIllness: '患者3天前开始发热，体温最高39°C，伴有咳嗽',
      pastHistory: '无特殊病史',
      physicalExam: '体温38.5°C，咽部充血，双肺呼吸音粗',
      diagnosis: '上呼吸道感染',
      treatment: '对症治疗，多饮水，注意休息',
      notes: '如症状加重请及时复诊',
      attachments: [],
      createdAt: '2024-01-14',
      status: 'active',
      doctorName: '李医生',
    },
  ];

  const initialUploadedFiles: UploadedFile[] = [
    {
      id: 'file001',
      name: '心电图报告.pdf',
      size: 2048576,
      type: 'application/pdf',
      uploadDate: '2024-01-15T10:30:00Z',
      ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      status: 'completed',
      progress: 100,
      url: 'https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    },
    {
      id: 'file002',
      name: '血常规检查.jpg',
      size: 1024768,
      type: 'image/jpeg',
      uploadDate: '2024-01-14T14:20:00Z',
      ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      status: 'completed',
      progress: 100,
      url: 'https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
    },
  ];

  // 从localStorage加载数据，如果没有则使用初始数据
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() =>
    loadFromStorage('medicalRecords', initialMedicalRecords)
  );

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() =>
    loadFromStorage('uploadedFiles', initialUploadedFiles)
  );

  // 初始化处方数据
  const initialPrescriptions: Prescription[] = [
    {
      id: 'PR001',
      patientId: 'P001234',
      patientName: '张三',
      patientAge: 45,
      diagnosis: '高血压',
      medications: [
        {
          id: 'MED001',
          name: '氨氯地平片',
          specification: '5mg',
          dosage: '1片',
          frequency: '每日1次',
          duration: '30天',
          quantity: 30,
          unit: '片',
          instructions: '晨起空腹服用',
        },
      ],
      doctorAdvice: '定期监测血压，注意饮食清淡',
      createdAt: '2024-01-15',
      status: 'active',
      doctorName: '李医生',
    },
  ];

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() =>
    loadFromStorage('prescriptions', initialPrescriptions)
  );

  const addMedicalRecord = (record: MedicalRecord) => {
    const updatedRecords = [...medicalRecords, record];
    setMedicalRecords(updatedRecords);
    saveToStorage('medicalRecords', updatedRecords);
  };

  const updateMedicalRecord = (id: string, updatedRecord: Partial<MedicalRecord>) => {
    const updatedRecords = medicalRecords.map(record =>
      record.id === id ? { ...record, ...updatedRecord } : record
    );
    setMedicalRecords(updatedRecords);
    saveToStorage('medicalRecords', updatedRecords);
  };

  const deleteMedicalRecord = (id: string) => {
    const updatedRecords = medicalRecords.filter(record => record.id !== id);
    setMedicalRecords(updatedRecords);
    saveToStorage('medicalRecords', updatedRecords);
  };

  const getMedicalRecord = (id: string) => {
    return medicalRecords.find(record => record.id === id);
  };

  const addUploadedFile = (file: UploadedFile) => {
    const updatedFiles = [...uploadedFiles, file];
    setUploadedFiles(updatedFiles);
    saveToStorage('uploadedFiles', updatedFiles);
  };

  const updateUploadedFile = (id: string, updatedFile: Partial<UploadedFile>) => {
    const updatedFiles = uploadedFiles.map(file =>
      file.id === id ? { ...file, ...updatedFile } : file
    );
    setUploadedFiles(updatedFiles);
    saveToStorage('uploadedFiles', updatedFiles);
  };

  const deleteUploadedFile = (id: string) => {
    const updatedFiles = uploadedFiles.filter(file => file.id !== id);
    setUploadedFiles(updatedFiles);
    saveToStorage('uploadedFiles', updatedFiles);
  };

  const getUploadedFile = (id: string) => {
    return uploadedFiles.find(file => file.id === id);
  };

  const addPrescription = (prescription: Prescription) => {
    const updatedPrescriptions = [...prescriptions, prescription];
    setPrescriptions(updatedPrescriptions);
    saveToStorage('prescriptions', updatedPrescriptions);
  };

  const updatePrescription = (id: string, updatedPrescription: Partial<Prescription>) => {
    const updatedPrescriptions = prescriptions.map(prescription =>
      prescription.id === id ? { ...prescription, ...updatedPrescription } : prescription
    );
    setPrescriptions(updatedPrescriptions);
    saveToStorage('prescriptions', updatedPrescriptions);
  };

  const deletePrescription = (id: string) => {
    const updatedPrescriptions = prescriptions.filter(prescription => prescription.id !== id);
    setPrescriptions(updatedPrescriptions);
    saveToStorage('prescriptions', updatedPrescriptions);
  };

  const getPrescription = (id: string) => {
    return prescriptions.find(prescription => prescription.id === id);
  };

  const value: MedicalRecordContextType = {
    medicalRecords,
    uploadedFiles,
    prescriptions,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    getMedicalRecord,
    addUploadedFile,
    updateUploadedFile,
    deleteUploadedFile,
    getUploadedFile,
    addPrescription,
    updatePrescription,
    deletePrescription,
    getPrescription,
  };

  return (
    <MedicalRecordContext.Provider value={value}>
      {children}
    </MedicalRecordContext.Provider>
  );
};

export default MedicalRecordContext;
