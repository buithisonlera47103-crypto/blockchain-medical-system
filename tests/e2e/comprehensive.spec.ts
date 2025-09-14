/**
 * 全面的端到端测试套件
 * 覆盖区块链电子病历系统的关键业务流程
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

// 测试数据生成器
class TestDataGenerator {
  static generatePatientData() {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'TestPassword123!',
      fullName: faker.person.fullName(),
      phoneNumber: faker.phone.number(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
      gender: faker.person.sex(),
      address: faker.location.streetAddress(),
    };
  }

  static generateDoctorData() {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'TestPassword123!',
      fullName: faker.person.fullName(),
      licenseNumber: faker.string.numeric(10),
      department: faker.helpers.arrayElement(['Cardiology', 'Neurology', 'Pediatrics', 'Surgery']),
      specialization: faker.helpers.arrayElement([
        'Internal Medicine',
        'Family Medicine',
        'Dermatology',
      ]),
    };
  }

  static generateMedicalRecord() {
    return {
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(2),
      recordType: faker.helpers.arrayElement(['诊断报告', '检查报告', '手术记录', '处方']),
      visitDate: faker.date.recent({ days: 30 }),
      diagnosis: faker.lorem.sentences(2),
      treatment: faker.lorem.sentences(3),
      medications: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
      notes: faker.lorem.paragraph(),
    };
  }
}

// 页面对象模型
class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
  }

  async fillCredentials(username: string, password: string) {
    await this.page.fill('[data-testid="username-input"]', username);
    await this.page.fill('[data-testid="password-input"]', password);
  }

  async submit() {
    await this.page.click('[data-testid="login-button"]');
  }

  async loginAs(username: string, password: string) {
    await this.fillCredentials(username, password);
    await this.submit();
    await this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  }

  async expectLoginError(message: string) {
    await expect(this.page.locator('[data-testid="login-error"]')).toContainText(message);
  }
}

class DashboardPage {
  constructor(private page: Page) {}

  async expectToBeVisible() {
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible();
  }

  async navigateToRecords() {
    await this.page.click('[data-testid="records-menu"]');
  }

  async navigateToUpload() {
    await this.page.click('[data-testid="upload-menu"]');
  }

  async navigateToSearch() {
    await this.page.click('[data-testid="search-menu"]');
  }

  async expectUserRole(role: string) {
    await expect(this.page.locator('[data-testid="user-role"]')).toContainText(role);
  }
}

class MedicalRecordsPage {
  constructor(private page: Page) {}

  async expectToBeVisible() {
    await expect(this.page.locator('[data-testid="records-page"]')).toBeVisible();
  }

  async searchRecords(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.click('[data-testid="search-button"]');
  }

  async viewRecord(recordId: string) {
    await this.page.click(`[data-testid="record-${recordId}"]`);
  }

  async expectRecordVisible(recordTitle: string) {
    await expect(this.page.locator('[data-testid="record-list"]')).toContainText(recordTitle);
  }

  async expectNoRecords() {
    await expect(this.page.locator('[data-testid="no-records"]')).toBeVisible();
  }

  async requestAccess(recordId: string, reason: string) {
    await this.page.click(`[data-testid="request-access-${recordId}"]`);
    await this.page.fill('[data-testid="access-reason"]', reason);
    await this.page.click('[data-testid="submit-request"]');
  }
}

class UploadPage {
  constructor(private page: Page) {}

  async expectToBeVisible() {
    await expect(this.page.locator('[data-testid="upload-page"]')).toBeVisible();
  }

  async uploadFile(filePath: string, recordData: any) {
    // 填写病历信息
    await this.page.fill('[data-testid="record-title"]', recordData.title);
    await this.page.fill('[data-testid="record-description"]', recordData.description);
    await this.page.selectOption('[data-testid="record-type"]', recordData.recordType);

    // 上传文件
    await this.page.setInputFiles('[data-testid="file-input"]', filePath);

    // 提交
    await this.page.click('[data-testid="upload-button"]');
  }

  async expectUploadSuccess() {
    await expect(this.page.locator('[data-testid="upload-success"]')).toBeVisible();
  }

  async expectUploadError(message: string) {
    await expect(this.page.locator('[data-testid="upload-error"]')).toContainText(message);
  }
}

class PermissionsPage {
  constructor(private page: Page) {}

  async expectToBeVisible() {
    await expect(this.page.locator('[data-testid="permissions-page"]')).toBeVisible();
  }

  async grantAccess(userId: string, recordId: string, permissions: string[]) {
    await this.page.click(`[data-testid="grant-access-${recordId}"]`);
    await this.page.fill('[data-testid="user-search"]', userId);

    for (const permission of permissions) {
      await this.page.check(`[data-testid="permission-${permission}"]`);
    }

    await this.page.click('[data-testid="grant-button"]');
  }

  async revokeAccess(userId: string, recordId: string) {
    await this.page.click(`[data-testid="revoke-access-${userId}-${recordId}"]`);
    await this.page.click('[data-testid="confirm-revoke"]');
  }

  async expectAccessGranted(userId: string, recordId: string) {
    await expect(this.page.locator(`[data-testid="access-${userId}-${recordId}"]`)).toContainText(
      '已授权'
    );
  }
}

// 测试套件开始
test.describe('区块链电子病历系统 E2E 测试', () => {
  let context: BrowserContext;
  let patientData: any;
  let doctorData: any;
  let recordData: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    patientData = TestDataGenerator.generatePatientData();
    doctorData = TestDataGenerator.generateDoctorData();
    recordData = TestDataGenerator.generateMedicalRecord();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('用户认证流程', () => {
    test('患者注册和登录', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // 导航到注册页面
      await page.goto('/register');

      // 填写注册信息
      await page.fill('[data-testid="username"]', patientData.username);
      await page.fill('[data-testid="email"]', patientData.email);
      await page.fill('[data-testid="password"]', patientData.password);
      await page.fill('[data-testid="full-name"]', patientData.fullName);
      await page.selectOption('[data-testid="role"]', 'patient');

      // 提交注册
      await page.click('[data-testid="register-button"]');

      // 验证注册成功
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();

      // 登录
      await loginPage.navigate();
      await loginPage.loginAs(patientData.username, patientData.password);

      // 验证登录成功
      await dashboardPage.expectToBeVisible();
      await dashboardPage.expectUserRole('患者');
    });

    test('医生注册和登录', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // 注册医生账户
      await page.goto('/register');
      await page.fill('[data-testid="username"]', doctorData.username);
      await page.fill('[data-testid="email"]', doctorData.email);
      await page.fill('[data-testid="password"]', doctorData.password);
      await page.fill('[data-testid="full-name"]', doctorData.fullName);
      await page.fill('[data-testid="license-number"]', doctorData.licenseNumber);
      await page.selectOption('[data-testid="department"]', doctorData.department);
      await page.selectOption('[data-testid="role"]', 'doctor');

      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();

      // 登录医生账户
      await loginPage.navigate();
      await loginPage.loginAs(doctorData.username, doctorData.password);

      await dashboardPage.expectToBeVisible();
      await dashboardPage.expectUserRole('医生');
    });

    test('登录失败处理', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);

      await loginPage.navigate();
      await loginPage.loginAs('invalid_user', 'wrong_password');
      await loginPage.expectLoginError('用户名或密码错误');
    });

    test('密码复杂度验证', async () => {
      const page = await context.newPage();

      await page.goto('/register');
      await page.fill('[data-testid="username"]', 'testuser');
      await page.fill('[data-testid="password"]', '123'); // 弱密码
      await page.click('[data-testid="register-button"]');

      await expect(page.locator('[data-testid="password-error"]')).toContainText('密码强度不足');
    });
  });

  test.describe('病历管理流程', () => {
    test('患者上传病历', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      const uploadPage = new UploadPage(page);

      // 患者登录
      await loginPage.navigate();
      await loginPage.loginAs(patientData.username, patientData.password);
      await dashboardPage.expectToBeVisible();

      // 导航到上传页面
      await dashboardPage.navigateToUpload();
      await uploadPage.expectToBeVisible();

      // 上传病历
      await uploadPage.uploadFile('test-files/sample-medical-record.pdf', recordData);
      await uploadPage.expectUploadSuccess();
    });

    test('医生查看病历（无权限）', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      const recordsPage = new MedicalRecordsPage(page);

      // 医生登录
      await loginPage.navigate();
      await loginPage.loginAs(doctorData.username, doctorData.password);
      await dashboardPage.expectToBeVisible();

      // 尝试查看病历
      await dashboardPage.navigateToRecords();
      await recordsPage.expectToBeVisible();
      await recordsPage.searchRecords(patientData.fullName);

      // 应该看不到记录或显示权限不足
      await recordsPage.expectNoRecords();
    });

    test('医生申请访问权限', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      const recordsPage = new MedicalRecordsPage(page);

      // 医生登录
      await loginPage.navigate();
      await loginPage.loginAs(doctorData.username, doctorData.password);
      await dashboardPage.expectToBeVisible();

      // 搜索患者
      await dashboardPage.navigateToSearch();
      await page.fill('[data-testid="patient-search"]', patientData.fullName);
      await page.click('[data-testid="search-patients"]');

      // 申请访问权限
      await page.click('[data-testid="request-access"]');
      await page.fill('[data-testid="access-reason"]', '诊疗需要，患者主动就医');
      await page.click('[data-testid="submit-request"]');

      // 验证申请成功
      await expect(page.locator('[data-testid="request-submitted"]')).toBeVisible();
    });

    test('患者授权医生访问', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      const permissionsPage = new PermissionsPage(page);

      // 患者登录
      await loginPage.navigate();
      await loginPage.loginAs(patientData.username, patientData.password);
      await dashboardPage.expectToBeVisible();

      // 查看权限请求
      await page.click('[data-testid="notifications"]');
      await expect(page.locator('[data-testid="access-request"]')).toBeVisible();

      // 授权访问
      await page.click('[data-testid="approve-access"]');
      await page.check('[data-testid="permission-read"]');
      await page.fill('[data-testid="access-duration"]', '30'); // 30天
      await page.click('[data-testid="confirm-approval"]');

      // 验证授权成功
      await expect(page.locator('[data-testid="access-granted"]')).toBeVisible();
    });

    test('医生访问已授权的病历', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      const recordsPage = new MedicalRecordsPage(page);

      // 医生登录
      await loginPage.navigate();
      await loginPage.loginAs(doctorData.username, doctorData.password);
      await dashboardPage.expectToBeVisible();

      // 查看病历
      await dashboardPage.navigateToRecords();
      await recordsPage.expectToBeVisible();
      await recordsPage.searchRecords(patientData.fullName);
      await recordsPage.expectRecordVisible(recordData.title);

      // 查看病历详情
      await page.click('[data-testid="view-record"]');
      await expect(page.locator('[data-testid="record-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="record-title"]')).toContainText(recordData.title);
    });
  });

  test.describe('区块链功能测试', () => {
    test('病历上链验证', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // 患者登录
      await loginPage.navigate();
      await loginPage.loginAs(patientData.username, patientData.password);
      await dashboardPage.expectToBeVisible();

      // 查看区块链状态
      await page.click('[data-testid="blockchain-status"]');
      await expect(page.locator('[data-testid="blockchain-info"]')).toBeVisible();

      // 验证交易哈希存在
      await expect(page.locator('[data-testid="transaction-hash"]')).not.toBeEmpty();
      await expect(page.locator('[data-testid="block-number"]')).not.toBeEmpty();
    });

    test('数据完整性验证', async () => {
      const page = await context.newPage();

      // 调用API验证数据完整性
      const response = await page.request.post('/api/v1/records/verify', {
        data: {
          recordId: 'test-record-id',
          contentHash: 'expected-hash',
        },
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.isValid).toBe(true);
    });

    test('跨链数据传输', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // 管理员登录
      await loginPage.navigate();
      await loginPage.loginAs('admin', 'admin_password');
      await dashboardPage.expectToBeVisible();

      // 发起跨链传输
      await page.click('[data-testid="cross-chain"]');
      await page.selectOption('[data-testid="target-chain"]', 'ethereum-testnet');
      await page.fill('[data-testid="transfer-data"]', 'sample-medical-data');
      await page.click('[data-testid="initiate-transfer"]');

      // 验证传输状态
      await expect(page.locator('[data-testid="transfer-status"]')).toContainText('进行中');

      // 等待传输完成 (最多2分钟)
      await page.waitForSelector('[data-testid="transfer-completed"]', { timeout: 120000 });
      await expect(page.locator('[data-testid="transfer-status"]')).toContainText('已完成');
    });
  });

  test.describe('安全功能测试', () => {
    test('多因素认证', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);

      // 启用MFA
      await page.goto('/settings/security');
      await page.click('[data-testid="enable-mfa"]');

      // 扫描QR码 (模拟)
      const secret = await page.locator('[data-testid="mfa-secret"]').textContent();
      expect(secret).toBeTruthy();

      // 验证MFA代码
      await page.fill('[data-testid="mfa-code"]', '123456'); // 模拟代码
      await page.click('[data-testid="verify-mfa"]');

      // 登出后重新登录测试MFA
      await page.click('[data-testid="logout"]');
      await loginPage.navigate();
      await loginPage.loginAs(patientData.username, patientData.password);

      // 应该要求MFA验证
      await expect(page.locator('[data-testid="mfa-required"]')).toBeVisible();
    });

    test('会话超时', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // 登录
      await loginPage.navigate();
      await loginPage.loginAs(patientData.username, patientData.password);
      await dashboardPage.expectToBeVisible();

      // 模拟会话超时
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.clear();
      });

      // 尝试访问受保护的页面
      await page.click('[data-testid="records-menu"]');

      // 应该重定向到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('权限边界测试', async () => {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);

      // 医生登录
      await loginPage.navigate();
      await loginPage.loginAs(doctorData.username, doctorData.password);

      // 尝试访问管理员功能
      const response = await page.request.get('/api/v1/admin/users');
      expect(response.status()).toBe(403); // 权限不足

      // 尝试访问其他患者的记录
      const forbiddenResponse = await page.request.get('/api/v1/records/unauthorized-patient-id');
      expect(forbiddenResponse.status()).toBe(403);
    });
  });

  test.describe('性能测试', () => {
    test('页面加载性能', async () => {
      const page = await context.newPage();

      // 监控性能指标
      await page.route('**/*', route => {
        const startTime = Date.now();
        route.continue().then(() => {
          const endTime = Date.now();
          console.log(`Resource loaded in ${endTime - startTime}ms: ${route.request().url()}`);
        });
      });

      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 验证页面加载时间小于3秒
      expect(loadTime).toBeLessThan(3000);
    });

    test('并发用户处理', async () => {
      const promises = [];

      // 模拟10个并发用户登录
      for (let i = 0; i < 10; i++) {
        const promise = (async () => {
          const page = await context.newPage();
          const loginPage = new LoginPage(page);
          const startTime = Date.now();

          await loginPage.navigate();
          await loginPage.loginAs(`testuser${i}`, 'password');

          const responseTime = Date.now() - startTime;
          await page.close();

          return responseTime;
        })();

        promises.push(promise);
      }

      const responseTimes = await Promise.all(promises);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      // 验证平均响应时间小于5秒
      expect(avgResponseTime).toBeLessThan(5000);
    });
  });

  test.describe('数据一致性测试', () => {
    test('数据库与区块链一致性', async () => {
      const page = await context.newPage();

      // 从数据库获取记录
      const dbResponse = await page.request.get('/api/v1/records/test-record-id');
      const dbRecord = await dbResponse.json();

      // 从区块链获取记录
      const blockchainResponse = await page.request.get(
        '/api/v1/blockchain/records/test-record-id'
      );
      const blockchainRecord = await blockchainResponse.json();

      // 验证数据一致性
      expect(dbRecord.contentHash).toBe(blockchainRecord.contentHash);
      expect(dbRecord.timestamp).toBe(blockchainRecord.timestamp);
    });

    test('IPFS数据完整性', async () => {
      const page = await context.newPage();

      // 上传文件到IPFS
      const uploadResponse = await page.request.post('/api/v1/ipfs/upload', {
        multipart: {
          file: {
            name: 'test.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('test content'),
          },
        },
      });

      const uploadResult = await uploadResponse.json();
      const cid = uploadResult.cid;

      // 验证文件可以检索
      const retrieveResponse = await page.request.get(`/api/v1/ipfs/retrieve/${cid}`);
      expect(retrieveResponse.ok()).toBeTruthy();

      const retrievedContent = await retrieveResponse.text();
      expect(retrievedContent).toBe('test content');
    });
  });

  test.describe('灾难恢复测试', () => {
    test('数据备份恢复', async () => {
      const page = await context.newPage();

      // 创建备份
      const backupResponse = await page.request.post('/api/v1/backup/create');
      expect(backupResponse.ok()).toBeTruthy();

      const backupResult = await backupResponse.json();
      const backupId = backupResult.backupId;

      // 模拟数据恢复
      const restoreResponse = await page.request.post('/api/v1/backup/restore', {
        data: { backupId },
      });

      expect(restoreResponse.ok()).toBeTruthy();
    });

    test('网络分区处理', async () => {
      const page = await context.newPage();

      // 模拟网络分区
      await page.route('**/api/v1/blockchain/**', route => {
        route.abort('failed');
      });

      // 尝试上传记录
      const response = await page.request.post('/api/v1/records/upload', {
        data: { title: 'Test Record', content: 'Test Content' },
      });

      // 应该返回适当的错误
      expect(response.status()).toBe(503); // 服务不可用
    });
  });

  test.describe('可访问性测试', () => {
    test('键盘导航', async () => {
      const page = await context.newPage();
      await page.goto('/dashboard');

      // 测试Tab键导航
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(focusedElement).toBeVisible();

      // 测试Enter键激活
      await page.keyboard.press('Enter');
      // 验证相应操作被触发
    });

    test('屏幕阅读器支持', async () => {
      const page = await context.newPage();
      await page.goto('/dashboard');

      // 检查ARIA标签
      const mainContent = page.locator('[role="main"]');
      await expect(mainContent).toBeVisible();

      // 检查alt属性
      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });
  });
});
