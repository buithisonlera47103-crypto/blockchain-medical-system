import * as fs from 'fs';
import * as path from 'path';

// Global Jest setup for backend-app tests
// - Ensure performance report directory exists for performance tests
// - Increase default timeout for slower integration tests
// - Can be extended to set up global mocks

try {
  const perfDir = path.join(process.cwd(), 'test-results', 'performance');
  fs.mkdirSync(perfDir, { recursive: true });
} catch {
  // ignore errors
}

jest.setTimeout(30000);

