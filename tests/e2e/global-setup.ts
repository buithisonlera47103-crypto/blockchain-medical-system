import { chromium, FullConfig } from '@playwright/test';
import { TestDataFactory } from './utils/test-data-factory';

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('🚀 Starting E2E test global setup...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend to be ready...');
    await waitForBackend(page);

    // Setup test data
    console.log('📊 Setting up test data...');
    await setupTestData();

    // Create test users and authenticate
    console.log('👤 Creating test users...');
    await createTestUsers(page);

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function waitForBackend(page: any, maxRetries = 30): Promise<void> {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.goto(`${baseURL}/api/v1/monitoring/health`);
      if (response?.status() === 200) {
        console.log('✅ Backend is ready');
        return;
      }
    } catch (error) {
      console.log(`⏳ Waiting for backend... (attempt ${i + 1}/${maxRetries})`);
      await page.waitForTimeout(2000);
    }
  }

  throw new Error('Backend failed to start within timeout');
}

async function setupTestData(): Promise<void> {
  const factory = new TestDataFactory();

  // Create test data in database
  await factory.createTestDatabase();
  await factory.seedTestData();

  console.log('✅ Test data setup completed');
}

async function createTestUsers(page: any): Promise<void> {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  const testUsers = [
    {
      email: 'doctor.test@blockchain-emr.com',
      password: 'TestPassword123!',
      role: 'doctor',
      firstName: 'Test',
      lastName: 'Doctor',
    },
    {
      email: 'nurse.test@blockchain-emr.com',
      password: 'TestPassword123!',
      role: 'nurse',
      firstName: 'Test',
      lastName: 'Nurse',
    },
    {
      email: 'patient.test@blockchain-emr.com',
      password: 'TestPassword123!',
      role: 'patient',
      firstName: 'Test',
      lastName: 'Patient',
    },
    {
      email: 'admin.test@blockchain-emr.com',
      password: 'TestPassword123!',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin',
    },
  ];

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const checkResponse = await page.request.get(`${baseURL}/api/v1/users/check`, {
        data: { email: user.email },
      });

      if (checkResponse.status() === 404) {
        // Create user
        const createResponse = await page.request.post(`${baseURL}/api/v1/auth/register`, {
          data: user,
        });

        if (createResponse.status() === 201) {
          console.log(`✅ Created test user: ${user.email}`);
        } else {
          console.warn(`⚠️ Failed to create user ${user.email}: ${createResponse.status()}`);
        }
      } else {
        console.log(`ℹ️ Test user already exists: ${user.email}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error creating user ${user.email}:`, error);
    }
  }
}

export default globalSetup;
