/**
 * 灾难恢复端到端测试
 * 使用Puppeteer测试完整的恢复流程
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';

// 测试配置
const TEST_CONFIG = {
  baseUrl: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000,
  adminCredentials: {
    username: process.env.TEST_ADMIN_USERNAME || 'admin',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
  },
  screenshots: {
    enabled: true,
    path: path.join(__dirname, '../../../screenshots/recovery'),
  },
};

// 测试数据
const MOCK_RECOVERY_DATA = {
  nodes: [
    {
      node_id: 'node-primary',
      ip_address: '192.168.1.100',
      status: 'active',
    },
    {
      node_id: 'node-backup',
      ip_address: '192.168.1.101',
      status: 'inactive',
    },
  ],
  backups: [
    {
      backup_id: 'backup-20240101',
      backup_type: 'full',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      backup_id: 'backup-20240102',
      backup_type: 'incremental',
      status: 'completed',
      created_at: '2024-01-02T00:00:00Z',
    },
  ],
};

describe('灾难恢复端到端测试', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // 设置请求拦截，模拟API响应
    await page.setRequestInterception(true);

    page.on('request', request => {
      const url = request.url();

      if (url.includes('/api/v1/recovery/nodes')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ nodes: MOCK_RECOVERY_DATA.nodes }),
        });
      } else if (url.includes('/api/v1/backup/list')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ backups: MOCK_RECOVERY_DATA.backups }),
        });
      } else if (url.includes('/api/v1/recovery/restore')) {
        // 模拟恢复过程
        setTimeout(() => {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              restoredCount: 1000,
              switchStatus: 'completed',
              message: '恢复成功',
            }),
          });
        }, 2000);
      } else {
        request.continue();
      }
    });
  });

  afterEach(async () => {
    if (TEST_CONFIG.screenshots.enabled) {
      const testName = expect.getState().currentTestName?.replace(/\s+/g, '_') || 'unknown';
      await page.screenshot({
        path: `${TEST_CONFIG.screenshots.path}/${testName}.png`,
        fullPage: true,
      });
    }
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('用户认证和权限', () => {
    test(
      '管理员登录并访问恢复面板',
      async () => {
        // 访问登录页面
        await page.goto(`${TEST_CONFIG.baseUrl}/login`);
        await page.waitForSelector('input[name="username"]');

        // 输入管理员凭据
        await page.type('input[name="username"]', TEST_CONFIG.adminCredentials.username);
        await page.type('input[name="password"]', TEST_CONFIG.adminCredentials.password);

        // 点击登录按钮
        await page.click('button[type="submit"]');

        // 等待登录成功并跳转
        await page.waitForNavigation();

        // 访问恢复面板
        await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
        await page.waitForSelector('[data-testid="recovery-panel"]', { timeout: 10000 });

        // 验证页面标题
        const title = await page.$eval('h1', el => el.textContent);
        expect(title).toContain('灾难恢复');
      },
      TEST_CONFIG.timeout
    );

    test(
      '非管理员用户被拒绝访问',
      async () => {
        // 模拟非管理员用户登录
        await page.goto(`${TEST_CONFIG.baseUrl}/login`);
        await page.waitForSelector('input[name="username"]');

        await page.type('input[name="username"]', 'user');
        await page.type('input[name="password"]', 'user123');
        await page.click('button[type="submit"]');

        // 尝试访问恢复面板
        await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);

        // 验证权限提示
        await page.waitForSelector('[data-testid="access-denied"]');
        const errorMessage = await page.$eval(
          '[data-testid="access-denied"]',
          el => el.textContent
        );
        expect(errorMessage).toContain('权限不足');
      },
      TEST_CONFIG.timeout
    );
  });

  describe('恢复面板功能', () => {
    beforeEach(async () => {
      // 模拟管理员已登录状态
      await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
      await page.evaluate(() => {
        localStorage.setItem('emr_token', 'mock-admin-token');
        localStorage.setItem(
          'emr_user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            name: 'Administrator',
            email: 'admin@example.com',
            role: 'admin',
          })
        );
      });
      await page.reload();
      await page.waitForSelector('[data-testid="recovery-panel"]');
    });

    test('显示节点状态列表', async () => {
      // 等待节点列表加载
      await page.waitForSelector('[data-testid="node-list"]');

      // 验证节点信息显示
      const nodeElements = await page.$$('[data-testid="node-item"]');
      expect(nodeElements.length).toBe(2);

      // 验证节点详细信息
      const primaryNode = await page.$eval('[data-testid="node-primary"]', el => el.textContent);
      expect(primaryNode).toContain('192.168.1.100');
      expect(primaryNode).toContain('active');

      const backupNode = await page.$eval('[data-testid="node-backup"]', el => el.textContent);
      expect(backupNode).toContain('192.168.1.101');
      expect(backupNode).toContain('inactive');
    });

    test('显示备份列表', async () => {
      // 等待备份列表加载
      await page.waitForSelector('[data-testid="backup-list"]');

      // 验证备份信息显示
      const backupElements = await page.$$('[data-testid="backup-item"]');
      expect(backupElements.length).toBe(2);

      // 验证备份详细信息
      const fullBackup = await page.$eval('[data-testid="backup-20240101"]', el => el.textContent);
      expect(fullBackup).toContain('full');
      expect(fullBackup).toContain('completed');

      const incBackup = await page.$eval('[data-testid="backup-20240102"]', el => el.textContent);
      expect(incBackup).toContain('incremental');
      expect(incBackup).toContain('completed');
    });
  });

  describe('恢复流程测试', () => {
    beforeEach(async () => {
      // 设置管理员登录状态
      await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
      await page.evaluate(() => {
        localStorage.setItem('emr_token', 'mock-admin-token');
        localStorage.setItem(
          'emr_user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            name: 'Administrator',
            email: 'admin@example.com',
            role: 'admin',
          })
        );
      });
      await page.reload();
      await page.waitForSelector('[data-testid="recovery-panel"]');
    });

    test(
      '执行完整恢复流程',
      async () => {
        // 等待备份列表加载
        await page.waitForSelector('[data-testid="backup-select"]');

        // 选择备份
        await page.select('[data-testid="backup-select"]', 'backup-20240101');

        // 点击恢复按钮
        await page.click('[data-testid="restore-button"]');

        // 验证确认对话框
        await page.waitForSelector('[data-testid="confirm-dialog"]');
        const confirmText = await page.$eval(
          '[data-testid="confirm-dialog"]',
          el => el.textContent
        );
        expect(confirmText).toContain('确认要执行恢复操作吗');

        // 确认恢复
        await page.click('[data-testid="confirm-restore"]');

        // 验证恢复进度显示
        await page.waitForSelector('[data-testid="recovery-progress"]');
        const progressBar = await page.$('[data-testid="progress-bar"]');
        expect(progressBar).toBeTruthy();

        // 等待恢复完成
        await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 15000 });

        // 验证成功消息
        const successMessage = await page.$eval(
          '[data-testid="recovery-success"]',
          el => el.textContent
        );
        expect(successMessage).toContain('恢复成功');
        expect(successMessage).toContain('1000');
      },
      TEST_CONFIG.timeout
    );

    test('取消恢复操作', async () => {
      // 选择备份
      await page.waitForSelector('[data-testid="backup-select"]');
      await page.select('[data-testid="backup-select"]', 'backup-20240102');

      // 点击恢复按钮
      await page.click('[data-testid="restore-button"]');

      // 等待确认对话框
      await page.waitForSelector('[data-testid="confirm-dialog"]');

      // 取消操作
      await page.click('[data-testid="cancel-restore"]');

      // 验证对话框关闭
      const dialog = await page.$('[data-testid="confirm-dialog"]');
      expect(dialog).toBeNull();

      // 验证没有进度显示
      const progress = await page.$('[data-testid="recovery-progress"]');
      expect(progress).toBeNull();
    });
  });

  describe('节点切换测试', () => {
    beforeEach(async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
      await page.evaluate(() => {
        localStorage.setItem('emr_token', 'mock-admin-token');
        localStorage.setItem(
          'emr_user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            name: 'Administrator',
            email: 'admin@example.com',
            role: 'admin',
          })
        );
      });
      await page.reload();
      await page.waitForSelector('[data-testid="recovery-panel"]');
    });

    test('执行节点故障切换', async () => {
      // 等待节点列表加载
      await page.waitForSelector('[data-testid="node-list"]');

      // 点击备用节点的切换按钮
      await page.click('[data-testid="failover-node-backup"]');

      // 验证切换确认对话框
      await page.waitForSelector('[data-testid="failover-confirm"]');
      const confirmText = await page.$eval(
        '[data-testid="failover-confirm"]',
        el => el.textContent
      );
      expect(confirmText).toContain('确认切换到备用节点');

      // 确认切换
      await page.click('[data-testid="confirm-failover"]');

      // 验证切换进度
      await page.waitForSelector('[data-testid="failover-progress"]');

      // 等待切换完成
      await page.waitForSelector('[data-testid="failover-success"]', { timeout: 10000 });

      // 验证成功消息
      const successMessage = await page.$eval(
        '[data-testid="failover-success"]',
        el => el.textContent
      );
      expect(successMessage).toContain('节点切换成功');
    });
  });

  describe('错误处理测试', () => {
    test('处理网络错误', async () => {
      // 设置网络错误拦截
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.url().includes('/api/v1/recovery/restore')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
      await page.evaluate(() => {
        localStorage.setItem('emr_token', 'mock-admin-token');
        localStorage.setItem(
          'emr_user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            name: 'Administrator',
            email: 'admin@example.com',
            role: 'admin',
          })
        );
      });
      await page.reload();

      // 尝试执行恢复
      await page.waitForSelector('[data-testid="backup-select"]');
      await page.select('[data-testid="backup-select"]', 'backup-20240101');
      await page.click('[data-testid="restore-button"]');
      await page.click('[data-testid="confirm-restore"]');

      // 验证错误消息
      await page.waitForSelector('[data-testid="recovery-error"]');
      const errorMessage = await page.$eval('[data-testid="recovery-error"]', el => el.textContent);
      expect(errorMessage).toContain('网络错误');
    });

    test('处理服务器错误', async () => {
      // 设置服务器错误响应
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.url().includes('/api/v1/recovery/restore')) {
          request.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: '服务器内部错误' }),
          });
        } else {
          request.continue();
        }
      });

      await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
      await page.evaluate(() => {
        localStorage.setItem('emr_token', 'mock-admin-token');
        localStorage.setItem(
          'emr_user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            name: 'Administrator',
            email: 'admin@example.com',
            role: 'admin',
          })
        );
      });
      await page.reload();

      // 执行恢复操作
      await page.waitForSelector('[data-testid="backup-select"]');
      await page.select('[data-testid="backup-select"]', 'backup-20240101');
      await page.click('[data-testid="restore-button"]');
      await page.click('[data-testid="confirm-restore"]');

      // 验证错误处理
      await page.waitForSelector('[data-testid="recovery-error"]');
      const errorMessage = await page.$eval('[data-testid="recovery-error"]', el => el.textContent);
      expect(errorMessage).toContain('服务器内部错误');
    });
  });

  describe('响应式设计测试', () => {
    test('移动设备适配', async () => {
      // 设置移动设备视口
      await page.setViewport({ width: 375, height: 667 });

      await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
      await page.evaluate(() => {
        localStorage.setItem('emr_token', 'mock-admin-token');
        localStorage.setItem(
          'emr_user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            name: 'Administrator',
            email: 'admin@example.com',
            role: 'admin',
          })
        );
      });
      await page.reload();

      // 验证移动端布局
      await page.waitForSelector('[data-testid="recovery-panel"]');

      // 检查响应式元素
      const mobileMenu = await page.$('[data-testid="mobile-menu"]');
      expect(mobileMenu).toBeTruthy();

      // 验证内容可滚动
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const clientHeight = await page.evaluate(() => document.body.clientHeight);
      expect(scrollHeight).toBeGreaterThanOrEqual(clientHeight);
    });

    test('平板设备适配', async () => {
      // 设置平板设备视口
      await page.setViewport({ width: 768, height: 1024 });

      await page.goto(`${TEST_CONFIG.baseUrl}/recovery`);
      await page.evaluate(() => {
        localStorage.setItem('emr_token', 'mock-admin-token');
        localStorage.setItem(
          'emr_user',
          JSON.stringify({
            id: '1',
            username: 'admin',
            name: 'Administrator',
            email: 'admin@example.com',
            role: 'admin',
          })
        );
      });
      await page.reload();

      // 验证平板端布局
      await page.waitForSelector('[data-testid="recovery-panel"]');

      // 验证布局适配
      const panelWidth = await page.$eval(
        '[data-testid="recovery-panel"]',
        el => window.getComputedStyle(el).width
      );
      expect(parseInt(panelWidth)).toBeLessThanOrEqual(768);
    });
  });
});
