import { test, expect } from '@playwright/test';
import { TestDataFactory } from '../utils/test-data-factory';

test.describe('Authentication - Login Flow', () => {
  let testDataFactory: TestDataFactory;

  test.beforeEach(async ({ page }) => {
    testDataFactory = new TestDataFactory();
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check if login form elements are present
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click login button without filling fields
    await page.click('[data-testid="login-button"]');

    // Check for validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Check for error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
  });

  test('should successfully login with valid doctor credentials', async ({ page }) => {
    // Use test doctor credentials
    await page.fill('[data-testid="email-input"]', 'doctor.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-role"]')).toContainText('Doctor');
  });

  test('should successfully login with valid nurse credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'nurse.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="user-role"]')).toContainText('Nurse');
  });

  test('should successfully login with valid patient credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'patient.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="user-role"]')).toContainText('Patient');
  });

  test('should handle rate limiting', async ({ page }) => {
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      await page.waitForTimeout(500);
    }

    // Should show rate limit error
    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access protected page
    await page.goto('/records');

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);

    // Login
    await page.fill('[data-testid="email-input"]', 'doctor.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    // Should redirect back to intended page
    await expect(page).toHaveURL(/.*\/records/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'doctor.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*\/dashboard/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should remember login state on page refresh', async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', 'doctor.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*\/dashboard/);

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle session expiration', async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', 'doctor.test@blockchain-emr.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*\/dashboard/);

    // Simulate session expiration by clearing storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access protected resource
    await page.goto('/records');

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
  });
});
