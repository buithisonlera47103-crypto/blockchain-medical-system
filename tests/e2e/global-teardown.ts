import { TestDataFactory } from './utils/test-data-factory';

async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting E2E test global teardown...');

  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    const factory = new TestDataFactory();
    await factory.cleanupTestData();

    // Clean up test files
    console.log('📁 Cleaning up test files...');
    await cleanupTestFiles();

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestFiles(): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');

  const testArtifactsDir = path.join(process.cwd(), 'test-results');
  const tempDir = path.join(process.cwd(), 'temp');

  try {
    // Clean up old test artifacts (keep last 5 runs)
    const artifacts = await fs.readdir(testArtifactsDir).catch(() => []);
    const sortedArtifacts = artifacts
      .filter((file: string) => file.startsWith('e2e-'))
      .sort()
      .reverse();

    for (let i = 5; i < sortedArtifacts.length; i++) {
      const artifactPath = path.join(testArtifactsDir, sortedArtifacts[i]);
      await fs.rm(artifactPath, { recursive: true, force: true });
    }

    // Clean up temporary test files
    const tempFiles = await fs.readdir(tempDir).catch(() => []);
    for (const file of tempFiles) {
      if (file.startsWith('test-')) {
        await fs.rm(path.join(tempDir, file), { recursive: true, force: true });
      }
    }

    console.log('✅ Test files cleanup completed');
  } catch (error) {
    console.warn('⚠️ Error during file cleanup:', error);
  }
}

export default globalTeardown;
