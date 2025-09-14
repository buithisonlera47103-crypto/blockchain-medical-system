export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting integration test global teardown...');

  try {
    // Get containers manager from global
    const containersManager = (global as any).__CONTAINERS_MANAGER__;

    if (containersManager) {
      await containersManager.stop();
      console.log('✅ Test containers stopped');
    }

    // Clean up global variables
    delete process.env["TEST_MYSQL_HOST"];
    delete process.env["TEST_MYSQL_PORT"];
    delete process.env["TEST_MYSQL_USER"];
    delete process.env["TEST_MYSQL_PASSWORD"];
    delete process.env["TEST_MYSQL_DATABASE"];
    delete process.env["TEST_REDIS_HOST"];
    delete process.env["TEST_REDIS_PORT"];

    console.log('✅ Integration test global teardown completed');
  } catch (error) {
    console.error('❌ Integration test global teardown failed:', error);
    // Don't throw to avoid masking test failures
  }
}
