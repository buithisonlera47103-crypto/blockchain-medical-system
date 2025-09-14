import { faker } from '@faker-js/faker';

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'doctor' | 'nurse' | 'patient' | 'admin';
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface TestMedicalRecord {
  id?: string;
  patientId: string;
  doctorId: string;
  title: string;
  description: string;
  recordType: 'consultation' | 'diagnosis' | 'prescription' | 'lab_result' | 'imaging';
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestPermission {
  id?: string;
  recordId: string;
  granterId: string;
  granteeId: string;
  permission: 'read' | 'write' | 'admin';
  expiresAt?: string;
  conditions?: Record<string, any>;
}

export class TestDataFactory {
  private static instance: TestDataFactory;
  private seededData: {
    users: TestUser[];
    records: TestMedicalRecord[];
    permissions: TestPermission[];
  } = {
    users: [],
    records: [],
    permissions: [],
  };

  constructor() {
    // Set deterministic seed for consistent test data
    faker.seed(12345);
  }

  static getInstance(): TestDataFactory {
    if (!TestDataFactory.instance) {
      TestDataFactory.instance = new TestDataFactory();
    }
    return TestDataFactory.instance;
  }

  // User factory methods
  createUser(overrides: Partial<TestUser> = {}): TestUser {
    const roles: TestUser['role'][] = ['doctor', 'nurse', 'patient', 'admin'];
    const role = overrides.role || faker.helpers.arrayElement(roles);

    return {
      email: overrides.email || faker.internet.email(),
      password: overrides.password || 'TestPassword123!',
      firstName: overrides.firstName || faker.person.firstName(),
      lastName: overrides.lastName || faker.person.lastName(),
      role,
      phoneNumber: overrides.phoneNumber || faker.phone.number(),
      dateOfBirth: overrides.dateOfBirth || faker.date.birthdate().toISOString().split('T')[0],
      address:
        overrides.address ||
        `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
      ...overrides,
    };
  }

  createDoctor(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'doctor',
      email: `doctor.${faker.string.alphanumeric(8)}@blockchain-emr.com`,
      ...overrides,
    });
  }

  createNurse(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'nurse',
      email: `nurse.${faker.string.alphanumeric(8)}@blockchain-emr.com`,
      ...overrides,
    });
  }

  createPatient(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'patient',
      email: `patient.${faker.string.alphanumeric(8)}@blockchain-emr.com`,
      ...overrides,
    });
  }

  // Medical record factory methods
  createMedicalRecord(overrides: Partial<TestMedicalRecord> = {}): TestMedicalRecord {
    const recordTypes: TestMedicalRecord['recordType'][] = [
      'consultation',
      'diagnosis',
      'prescription',
      'lab_result',
      'imaging',
    ];

    return {
      patientId: overrides.patientId || faker.string.uuid(),
      doctorId: overrides.doctorId || faker.string.uuid(),
      title: overrides.title || faker.lorem.sentence(),
      description: overrides.description || faker.lorem.paragraphs(2),
      recordType: overrides.recordType || faker.helpers.arrayElement(recordTypes),
      metadata: overrides.metadata || {
        symptoms: faker.helpers.arrayElements(
          ['headache', 'fever', 'cough', 'fatigue', 'nausea', 'dizziness'],
          { min: 1, max: 3 }
        ),
        diagnosis: faker.lorem.words(3),
        treatment: faker.lorem.sentence(),
        notes: faker.lorem.paragraph(),
      },
      createdAt: overrides.createdAt || faker.date.recent().toISOString(),
      updatedAt: overrides.updatedAt || new Date().toISOString(),
      ...overrides,
    };
  }

  // Permission factory methods
  createPermission(overrides: Partial<TestPermission> = {}): TestPermission {
    const permissions: TestPermission['permission'][] = ['read', 'write', 'admin'];

    return {
      recordId: overrides.recordId || faker.string.uuid(),
      granterId: overrides.granterId || faker.string.uuid(),
      granteeId: overrides.granteeId || faker.string.uuid(),
      permission: overrides.permission || faker.helpers.arrayElement(permissions),
      expiresAt: overrides.expiresAt || faker.date.future().toISOString(),
      conditions: overrides.conditions || {
        ipRestriction: faker.internet.ip(),
        timeRestriction: {
          startTime: '09:00',
          endTime: '17:00',
        },
      },
      ...overrides,
    };
  }

  // Batch creation methods
  createUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  createMedicalRecords(
    count: number,
    overrides: Partial<TestMedicalRecord> = {}
  ): TestMedicalRecord[] {
    return Array.from({ length: count }, () => this.createMedicalRecord(overrides));
  }

  createPermissions(count: number, overrides: Partial<TestPermission> = {}): TestPermission[] {
    return Array.from({ length: count }, () => this.createPermission(overrides));
  }

  // Database operations
  async createTestDatabase(): Promise<void> {
    // This would typically connect to a test database
    // For now, we'll simulate database operations
    console.log('📊 Creating test database schema...');

    // In a real implementation, you would:
    // 1. Connect to test database
    // 2. Run migrations
    // 3. Create test schema

    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Test database schema created');
  }

  async seedTestData(): Promise<void> {
    console.log('🌱 Seeding test data...');

    // Create test users
    this.seededData.users = [
      this.createDoctor({ email: 'doctor.test@blockchain-emr.com' }),
      this.createNurse({ email: 'nurse.test@blockchain-emr.com' }),
      this.createPatient({ email: 'patient.test@blockchain-emr.com' }),
      this.createUser({ role: 'admin', email: 'admin.test@blockchain-emr.com' }),
      ...this.createUsers(10), // Additional random users
    ];

    // Create test medical records
    this.seededData.records = this.createMedicalRecords(20, {
      patientId: this.seededData.users.find(u => u.role === 'patient')?.id,
      doctorId: this.seededData.users.find(u => u.role === 'doctor')?.id,
    });

    // Create test permissions
    this.seededData.permissions = this.createPermissions(15, {
      recordId: this.seededData.records[0]?.id,
      granterId: this.seededData.users.find(u => u.role === 'doctor')?.id,
      granteeId: this.seededData.users.find(u => u.role === 'nurse')?.id,
    });

    // In a real implementation, you would save this data to the database
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Test data seeded');
  }

  async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    // In a real implementation, you would:
    // 1. Delete test records from database
    // 2. Reset sequences/auto-increment values
    // 3. Clean up test files

    this.seededData = { users: [], records: [], permissions: [] };

    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Test data cleanup completed');
  }

  // Getter methods for seeded data
  getSeededUsers(): TestUser[] {
    return this.seededData.users;
  }

  getSeededRecords(): TestMedicalRecord[] {
    return this.seededData.records;
  }

  getSeededPermissions(): TestPermission[] {
    return this.seededData.permissions;
  }

  // Helper methods
  getTestUser(role: TestUser['role']): TestUser | undefined {
    return this.seededData.users.find(user => user.role === role);
  }

  getRandomTestUser(): TestUser {
    return faker.helpers.arrayElement(this.seededData.users);
  }

  getRandomMedicalRecord(): TestMedicalRecord {
    return faker.helpers.arrayElement(this.seededData.records);
  }
}
