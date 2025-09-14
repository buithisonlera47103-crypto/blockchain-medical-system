import { test, expect } from '@playwright/test';
import { TestDataFactory } from '../utils/test-data-factory';
import path from 'path';

test.describe('Medical Records Management', () => {
  let testDataFactory: TestDataFactory;

  test.beforeEach(async ({ page }) => {
    testDataFactory = new TestDataFactory();

    // Login as doctor
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'doctor.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display medical records list', async ({ page }) => {
    await page.goto('/records');

    // Check if records list is displayed
    await expect(page.locator('[data-testid="records-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-record-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-records-input"]')).toBeVisible();
  });

  test('should create a new medical record', async ({ page }) => {
    await page.goto('/records');

    // Click create record button
    await page.click('[data-testid="create-record-button"]');

    // Fill in record details
    await page.fill('[data-testid="record-title-input"]', 'Test Consultation Record');
    await page.fill(
      '[data-testid="record-description-textarea"]',
      'Patient presented with symptoms of headache and fever.'
    );
    await page.selectOption('[data-testid="record-type-select"]', 'consultation');
    await page.selectOption('[data-testid="patient-select"]', { label: 'Test Patient' });

    // Add metadata
    await page.fill('[data-testid="symptoms-input"]', 'headache, fever');
    await page.fill('[data-testid="diagnosis-input"]', 'Viral infection');
    await page.fill('[data-testid="treatment-input"]', 'Rest and hydration');

    // Save record
    await page.click('[data-testid="save-record-button"]');

    // Should show success message and redirect
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Record created successfully'
    );

    // Should be in records list with new record
    await expect(page).toHaveURL(/.*\/records/);
    await expect(page.locator('[data-testid="record-item"]').first()).toContainText(
      'Test Consultation Record'
    );
  });

  test('should upload and attach files to medical record', async ({ page }) => {
    await page.goto('/records');
    await page.click('[data-testid="create-record-button"]');

    // Fill basic record info
    await page.fill('[data-testid="record-title-input"]', 'Record with Attachment');
    await page.fill('[data-testid="record-description-textarea"]', 'Record with file attachment.');
    await page.selectOption('[data-testid="record-type-select"]', 'lab_result');

    // Upload file
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-lab-result.pdf');

    // Create a test file if it doesn't exist
    await page.evaluate(() => {
      const blob = new Blob(['Test lab result content'], { type: 'application/pdf' });
      const file = new File([blob], 'test-lab-result.pdf', { type: 'application/pdf' });

      // Simulate file selection
      const input = document.querySelector('[data-testid="file-upload-input"]') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify file is uploaded
    await expect(page.locator('[data-testid="uploaded-file-item"]')).toBeVisible();
    await expect(page.locator('[data-testid="uploaded-file-name"]')).toContainText(
      'test-lab-result.pdf'
    );

    // Save record
    await page.click('[data-testid="save-record-button"]');

    // Verify record is created with attachment
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should view medical record details', async ({ page }) => {
    await page.goto('/records');

    // Click on first record
    await page.click('[data-testid="record-item"]');

    // Should navigate to record details
    await expect(page).toHaveURL(/.*\/records\/[a-f0-9-]+/);

    // Check record details are displayed
    await expect(page.locator('[data-testid="record-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-metadata"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-blockchain-hash"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-created-date"]')).toBeVisible();
  });

  test('should edit existing medical record', async ({ page }) => {
    await page.goto('/records');

    // Click on first record
    await page.click('[data-testid="record-item"]');

    // Click edit button
    await page.click('[data-testid="edit-record-button"]');

    // Modify record
    await page.fill('[data-testid="record-title-input"]', 'Updated Record Title');
    await page.fill(
      '[data-testid="record-description-textarea"]',
      'Updated description with additional notes.'
    );

    // Save changes
    await page.click('[data-testid="save-record-button"]');

    // Verify update
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-title"]')).toContainText(
      'Updated Record Title'
    );
  });

  test('should search medical records', async ({ page }) => {
    await page.goto('/records');

    // Search for records
    await page.fill('[data-testid="search-records-input"]', 'consultation');
    await page.press('[data-testid="search-records-input"]', 'Enter');

    // Should filter records
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-item"]')).toContainText('consultation');
  });

  test('should filter records by type', async ({ page }) => {
    await page.goto('/records');

    // Apply filter
    await page.selectOption('[data-testid="record-type-filter"]', 'consultation');

    // Should show only consultation records
    const recordItems = page.locator('[data-testid="record-item"]');
    const count = await recordItems.count();

    for (let i = 0; i < count; i++) {
      await expect(recordItems.nth(i).locator('[data-testid="record-type"]')).toContainText(
        'consultation'
      );
    }
  });

  test('should download medical record', async ({ page }) => {
    await page.goto('/records');

    // Click on first record
    await page.click('[data-testid="record-item"]');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-record-button"]');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/medical-record-.*\.pdf/);
  });

  test('should handle large file uploads with progress', async ({ page }) => {
    await page.goto('/records');
    await page.click('[data-testid="create-record-button"]');

    // Fill basic info
    await page.fill('[data-testid="record-title-input"]', 'Large File Record');
    await page.fill('[data-testid="record-description-textarea"]', 'Record with large file.');

    // Simulate large file upload
    await page.evaluate(() => {
      const blob = new Blob([new ArrayBuffer(10 * 1024 * 1024)], { type: 'application/pdf' }); // 10MB
      const file = new File([blob], 'large-file.pdf', { type: 'application/pdf' });

      const input = document.querySelector('[data-testid="file-upload-input"]') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 30000 });
  });

  test('should validate file types and sizes', async ({ page }) => {
    await page.goto('/records');
    await page.click('[data-testid="create-record-button"]');

    // Try to upload invalid file type
    await page.evaluate(() => {
      const blob = new Blob(['test content'], { type: 'application/exe' });
      const file = new File([blob], 'malicious.exe', { type: 'application/exe' });

      const input = document.querySelector('[data-testid="file-upload-input"]') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show error message
    await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-type-error"]')).toContainText(
      'File type not allowed'
    );
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/v1/records', route => route.abort());

    await page.goto('/records');

    // Should show error message
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Restore network and retry
    await page.unroute('**/api/v1/records');
    await page.click('[data-testid="retry-button"]');

    // Should load records
    await expect(page.locator('[data-testid="records-list"]')).toBeVisible();
  });
});
