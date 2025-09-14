/**
 * E2E测试 - 端到端测试
 * 使用Puppeteer模拟用户操作
 * 测试完整的用户流程和跨浏览器兼容性
 */

import puppeteer, { Browser, Page } from 'puppeteer';

// 测试配置
const TEST_CONFIG = {
  baseUrl: process.env.REACT_APP_TEST_URL || 'http://localhost:3000',
  apiUrl: process.env.REACT_APP_API_URL || 'https://localhost:3001',
  timeout: 30000,
  viewport: {
    width: 1280,
    height: 720,
  },
  credentials: {
    doctor: {
      username: 'test_doctor',
      password: 'test_password_123',
    },
    patient: {
      username: 'test_patient',
      password: 'test_password_456',
    },
  },
};

// 测试辅助函数
class E2ETestHelper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setup(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 50,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(TEST_CONFIG.viewport);

    // 设置请求拦截
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      // 允许所有请求通过
      request.continue();
    });

    // 监听控制台错误
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // 监听页面错误
    this.page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
  }

  async teardown(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  async navigateTo(path: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    const url = `${TEST_CONFIG.baseUrl}${path}`;
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  async login(userType: 'doctor' | 'patient'): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    const credentials = TEST_CONFIG.credentials[userType];

    // 导航到登录页
    await this.navigateTo('/login');

    // 等待登录表单加载
    await this.page.waitForSelector('form', { timeout: TEST_CONFIG.timeout });

    // 填写用户名
    await this.page.type('input[name="username"]', credentials.username);

    // 填写密码
    await this.page.type('input[name="password"]', credentials.password);

    // 选择角色
    await this.page.click(`input[value="${userType}"]`);

    // 点击登录按钮
    await this.page.click('button[type="submit"]');

    // 等待登录成功并跳转
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  async logout(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    // 查找并点击登出按钮
    const logoutButton = await this.page.$('button[data-testid="logout"], .logout-button');
    if (logoutButton) {
      await logoutButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    }
  }

  async takeScreenshot(name: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.screenshot({
      path: `test/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  async waitForElement(selector: string, timeout: number = TEST_CONFIG.timeout): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.waitForSelector(selector, { timeout });
  }

  async clickElement(selector: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.click(selector);
  }

  async typeText(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.type(selector, text);
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    const input = await this.page.$(selector);
    if (input) {
      await (input as any).uploadFile(filePath);
    }
  }

  async getPageTitle(): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    return this.page.url();
  }

  async getElementText(selector: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    const element = await this.page.$(selector);
    if (element) {
      return await this.page.evaluate(el => el.textContent || '', element);
    }
    return '';
  }

  async isElementVisible(selector: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  getPage(): Page {
    if (!this.page) throw new Error('Page not initialized');
    return this.page;
  }
}

// 测试套件
describe('E2E Tests - 区块链电子病历系统', () => {
  let helper: E2ETestHelper;

  beforeAll(async () => {
    helper = new E2ETestHelper();
    await helper.setup();
  }, TEST_CONFIG.timeout);

  afterAll(async () => {
    await helper.teardown();
  });

  describe('用户认证流程', () => {
    test(
      '医生登录流程',
      async () => {
        // 导航到登录页
        await helper.navigateTo('/login');
        await helper.takeScreenshot('login-page');

        // 验证登录页面元素
        expect(await helper.isElementVisible('form')).toBe(true);
        expect(await helper.isElementVisible('input[name="username"]')).toBe(true);
        expect(await helper.isElementVisible('input[name="password"]')).toBe(true);

        // 执行登录
        await helper.login('doctor');
        await helper.takeScreenshot('dashboard-after-login');

        // 验证登录成功
        const currentUrl = await helper.getCurrentUrl();
        expect(currentUrl).toContain('/dashboard');

        // 验证用户信息显示
        expect(await helper.isElementVisible('.user-info, [data-testid="user-info"]')).toBe(true);
      },
      TEST_CONFIG.timeout
    );

    test(
      '患者登录流程',
      async () => {
        // 先登出当前用户
        await helper.logout();

        // 患者登录
        await helper.login('patient');
        await helper.takeScreenshot('patient-dashboard');

        // 验证患者视图
        const currentUrl = await helper.getCurrentUrl();
        expect(currentUrl).toContain('/dashboard');
      },
      TEST_CONFIG.timeout
    );

    test(
      '登录验证错误处理',
      async () => {
        await helper.logout();
        await helper.navigateTo('/login');

        // 输入错误凭据
        await helper.typeText('input[name="username"]', 'invalid_user');
        await helper.typeText('input[name="password"]', 'wrong_password');
        await helper.clickElement('button[type="submit"]');

        // 验证错误消息显示
        await helper.waitForElement('.error-message, .toast-error', 5000);
        expect(await helper.isElementVisible('.error-message, .toast-error')).toBe(true);

        await helper.takeScreenshot('login-error');
      },
      TEST_CONFIG.timeout
    );
  });

  describe('医疗记录管理流程', () => {
    beforeEach(async () => {
      await helper.login('doctor');
    });

    test(
      '上传医疗记录流程',
      async () => {
        // 导航到上传页面
        await helper.navigateTo('/upload');
        await helper.takeScreenshot('upload-page');

        // 验证上传表单
        expect(await helper.isElementVisible('form')).toBe(true);
        expect(await helper.isElementVisible('input[type="file"]')).toBe(true);

        // 填写患者信息
        await helper.typeText('input[name="patientId"]', 'P001');

        // 选择记录类型
        await helper.clickElement('select[name="recordType"]');
        await helper.clickElement('option[value="examination"]');

        // 添加描述
        await helper.typeText('textarea[name="description"]', '血液检查报告');

        // 模拟文件上传（需要创建测试文件）
        // await helper.uploadFile('input[type="file"]', 'test/fixtures/test-report.pdf');

        // 提交表单
        await helper.clickElement('button[type="submit"]');

        // 验证上传成功
        await helper.waitForElement('.success-message, .toast-success', 10000);
        await helper.takeScreenshot('upload-success');
      },
      TEST_CONFIG.timeout
    );

    test(
      '查询医疗记录流程',
      async () => {
        // 导航到查询页面
        await helper.navigateTo('/query');
        await helper.takeScreenshot('query-page');

        // 验证查询表单
        expect(await helper.isElementVisible('.search-form, form')).toBe(true);

        // 执行搜索
        await helper.typeText('input[name="query"]', 'P001');
        await helper.clickElement('button[type="submit"], .search-button');

        // 等待搜索结果
        await helper.waitForElement('.search-results, .records-list', 10000);
        await helper.takeScreenshot('query-results');

        // 验证搜索结果
        expect(await helper.isElementVisible('.search-results, .records-list')).toBe(true);
      },
      TEST_CONFIG.timeout
    );

    test(
      '记录详情查看流程',
      async () => {
        await helper.navigateTo('/query');

        // 搜索记录
        await helper.typeText('input[name="query"]', 'P001');
        await helper.clickElement('button[type="submit"], .search-button');

        // 等待结果并点击第一个记录
        await helper.waitForElement('.record-item, .record-card', 10000);
        await helper.clickElement('.record-item:first-child, .record-card:first-child');

        // 验证详情页面
        await helper.waitForElement('.record-detail, .detail-view', 5000);
        await helper.takeScreenshot('record-detail');

        expect(await helper.isElementVisible('.record-detail, .detail-view')).toBe(true);
      },
      TEST_CONFIG.timeout
    );
  });

  describe('所有权转移流程', () => {
    beforeEach(async () => {
      await helper.login('doctor');
    });

    test(
      '发起转移流程',
      async () => {
        // 导航到转移页面
        await helper.navigateTo('/transfer');
        await helper.takeScreenshot('transfer-page');

        // 验证转移表单
        expect(await helper.isElementVisible('form')).toBe(true);

        // 填写转移信息
        await helper.typeText('input[name="recordId"]', 'R001');
        await helper.typeText('input[name="toUserId"]', 'doctor2');
        await helper.typeText('textarea[name="reason"]', '患者转诊');

        // 提交转移请求
        await helper.clickElement('button[type="submit"]');

        // 验证转移成功
        await helper.waitForElement('.success-message, .toast-success', 10000);
        await helper.takeScreenshot('transfer-success');
      },
      TEST_CONFIG.timeout
    );
  });

  describe('仪表板功能', () => {
    beforeEach(async () => {
      await helper.login('doctor');
    });

    test(
      '仪表板数据加载',
      async () => {
        await helper.navigateTo('/dashboard');
        await helper.takeScreenshot('dashboard-loaded');

        // 验证统计卡片
        expect(await helper.isElementVisible('.stats-card, .statistic-card')).toBe(true);

        // 验证图表
        expect(await helper.isElementVisible('.chart-container, .recharts-wrapper')).toBe(true);

        // 验证最近记录列表
        expect(await helper.isElementVisible('.recent-records, .records-list')).toBe(true);
      },
      TEST_CONFIG.timeout
    );

    test(
      '图表交互功能',
      async () => {
        await helper.navigateTo('/dashboard');

        // 等待图表加载
        await helper.waitForElement('.chart-container, .recharts-wrapper', 10000);

        // 测试图表悬停（如果支持）
        const chartElement = await helper.getPage().$('.chart-container .recharts-wrapper');
        if (chartElement) {
          await chartElement.hover();
          await helper.takeScreenshot('chart-hover');
        }
      },
      TEST_CONFIG.timeout
    );
  });

  describe('响应式设计测试', () => {
    test(
      '移动设备视图',
      async () => {
        // 设置移动设备视口
        await helper.getPage().setViewport({ width: 375, height: 667 });

        await helper.login('doctor');
        await helper.takeScreenshot('mobile-dashboard');

        // 验证移动端布局
        expect(await helper.isElementVisible('.mobile-menu, .hamburger-menu')).toBe(true);
      },
      TEST_CONFIG.timeout
    );

    test(
      '平板设备视图',
      async () => {
        // 设置平板设备视口
        await helper.getPage().setViewport({ width: 768, height: 1024 });

        await helper.login('doctor');
        await helper.takeScreenshot('tablet-dashboard');

        // 验证平板端布局适配
        const currentUrl = await helper.getCurrentUrl();
        expect(currentUrl).toContain('/dashboard');
      },
      TEST_CONFIG.timeout
    );
  });

  describe('安全性测试', () => {
    test(
      '未授权访问保护',
      async () => {
        // 在未登录状态下尝试访问受保护页面
        await helper.navigateTo('/dashboard');

        // 应该被重定向到登录页
        const currentUrl = await helper.getCurrentUrl();
        expect(currentUrl).toContain('/login');

        await helper.takeScreenshot('unauthorized-redirect');
      },
      TEST_CONFIG.timeout
    );

    test(
      'XSS防护测试',
      async () => {
        await helper.login('doctor');
        await helper.navigateTo('/query');

        // 尝试输入XSS payload
        const xssPayload = '<script>alert("XSS")</script>';
        await helper.typeText('input[name="query"]', xssPayload);
        await helper.clickElement('button[type="submit"], .search-button');

        // 验证XSS被阻止
        const page = helper.getPage();
        const alerts = [];
        page.on('dialog', dialog => {
          alerts.push(dialog.message());
          dialog.dismiss();
        });

        // 等待一段时间确保没有弹窗
        await page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, 2000)));
        expect(alerts.length).toBe(0);

        await helper.takeScreenshot('xss-protection');
      },
      TEST_CONFIG.timeout
    );
  });

  describe('性能测试', () => {
    test(
      '页面加载性能',
      async () => {
        const startTime = Date.now();

        await helper.navigateTo('/dashboard');
        await helper.login('doctor');

        const endTime = Date.now();
        const loadTime = endTime - startTime;

        // 验证页面加载时间在合理范围内
        expect(loadTime).toBeLessThan(10000); // 10秒内

        console.log(`Dashboard load time: ${loadTime}ms`);
      },
      TEST_CONFIG.timeout
    );

    test(
      '大数据量处理',
      async () => {
        await helper.login('doctor');
        await helper.navigateTo('/query');

        // 执行可能返回大量数据的搜索
        await helper.typeText('input[name="query"]', '*');
        await helper.clickElement('button[type="submit"], .search-button');

        // 验证页面仍然响应
        await helper.waitForElement('.search-results, .records-list', 15000);
        expect(await helper.isElementVisible('.search-results, .records-list')).toBe(true);

        await helper.takeScreenshot('large-data-results');
      },
      TEST_CONFIG.timeout
    );
  });

  describe('跨浏览器兼容性', () => {
    // 注意：这个测试需要在CI环境中配置多个浏览器
    test(
      'Chrome兼容性',
      async () => {
        // 当前测试已经在Chrome中运行
        await helper.login('doctor');
        expect(await helper.getCurrentUrl()).toContain('/dashboard');
      },
      TEST_CONFIG.timeout
    );

    // 可以添加Firefox等其他浏览器的测试
    // 需要在CI配置中安装相应的浏览器
  });
});
