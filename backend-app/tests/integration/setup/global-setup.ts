import { TestContainersManager } from './testcontainers';

let containersManager: TestContainersManager;

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting integration test global setup...');

  try {
    // Start test containers
    containersManager = new TestContainersManager();
    const containers = await containersManager.start();

    // Store container connection info in global variables
    process.env["TEST_MYSQL_HOST"] = containers.mysql.getHost();
    process.env["TEST_MYSQL_PORT"] = containers.mysql.getMappedPort(3306).toString();
    process.env["TEST_MYSQL_USER"] = 'test_user';
    process.env["TEST_MYSQL_PASSWORD"] = 'test_password';
    process.env["TEST_MYSQL_DATABASE"] = 'blockchain_emr_test';

    process.env["TEST_REDIS_HOST"] = containers.redis.getHost();
    process.env["TEST_REDIS_PORT"] = containers.redis.getMappedPort(6379).toString();

    // Seed initial test data
    await containersManager.seedTestData(containers.mysqlClient);

    // Store containers manager globally for cleanup
    (global as any).__CONTAINERS_MANAGER__ = containersManager;

    console.log('✅ Integration test global setup completed');
  } catch (error) {
    console.error('❌ Integration test global setup failed:', error);

    // Cleanup on failure
    if (containersManager) {
      await containersManager.stop();
    }

    throw error;
  }
}

// Cleanup function for Jest
export async function cleanup(): Promise<void> {
  const manager = (global as any).__CONTAINERS_MANAGER__;
  if (manager) {
    await manager.stop();
  }
}
