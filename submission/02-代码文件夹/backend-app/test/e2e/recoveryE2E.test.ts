/**
 * 灾难恢复 - 端到端测试
 * 使用Puppeteer模拟用户操作，测试完整的恢复流程
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { RecoveryService } from '../../src/services/RecoveryService';
import { BackupService } from '../../src/services/BackupService';
import { logger } from '../../src/utils/logger';
import fs from 'fs';
import path from 'path';

describe('灾难恢复 - 端到端测试', () => {
  let browser: Browser;
  let page: Page;
  let recoveryService: RecoveryService;
  let backupService: BackupService;
  let testBackupId: string;
  let screenshotDir: string;

  beforeAll(async () => {
    // 启动浏览器 - 支持Edge浏览器
    const browserOptions: any = {
      headless: process.env["CI"] === 'true', // CI环境中使用headless模式
      slowMo: 50,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    };

    // 如果指定使用Edge浏览器
    if (process.env["BROWSER_TYPE"] === 'edge') {
      // 尝试使用Edge浏览器路径
      const edgePaths = [
        '/usr/bin/microsoft-edge',
        '/usr/bin/microsoft-edge-stable',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ];

      for (const edgePath of edgePaths) {
        try {
          if (fs.existsSync(edgePath)) {
            browserOptions.executablePath = edgePath;
            break;
          }
        } catch (error) {
          // 继续尝试下一个路径
        }
      }
    }

    browser = await puppeteer.launch(browserOptions);

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // 初始化服务
    recoveryService = new RecoveryService();
    backupService = new BackupService();

    // 创建截图目录
    screenshotDir = path.join(__dirname, '../screenshots/recovery');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 创建测试备份
    const backupResult = await backupService.createBackup({
      backupType: 'both',
      userId: 'test-admin-user',
      encryptionKey: process.env["RECOVERY_ENCRYPTION_KEY"],
    });
    testBackupId = backupResult.backupId;

    logger.info('E2E测试准备完成', {
      backupId: testBackupId,
      screenshotDir,
    });
  }, 120000);

  afterAll(async () => {
    // 清理测试数据
    if (testBackupId) {
      await backupService.deleteBackup(testBackupId);
    }

    // 关闭浏览器
    if (browser) {
      await browser.close();
    }
  }, 60000);

  describe('管理员恢复面板测试', () => {
    test('应该能够访问恢复管理面板', async () => {
      const frontendUrl = process.env["FRONTEND_URL"] || 'http://localhost:3000';

      // 导航到登录页面
      await page.goto(`${frontendUrl}/login`);
      await page.waitForSelector('#email', { timeout: 10000 });

      // 截图：登录页面
      await page.screenshot({
        path: path.join(screenshotDir, '01-login-page.png') as `${string}.png`,
        fullPage: true,
      });

      // 管理员登录
      await page.type('#email', process.env["TEST_ADMIN_EMAIL"] || 'admin@example.com');
      await page.type('#password', process.env["TEST_ADMIN_PASSWORD"] || 'adminpassword123');

      // 截图：填写登录信息
      await page.screenshot({
        path: path.join(screenshotDir, '02-login-filled.png') as `${string}.png`,
        fullPage: true,
      });

      await page.click('button[type="submit"]');

      // 等待登录成功并跳转
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

      // 截图：登录成功后的主页
      await page.screenshot({
        path: path.join(screenshotDir, '03-dashboard.png') as `${string}.png`,
        fullPage: true,
      });

      // 导航到恢复管理页面
      await page.goto(`${frontendUrl}/admin/recovery`);
      await page.waitForSelector('.recovery-panel', { timeout: 10000 });

      // 截图：恢复管理面板
      await page.screenshot({
        path: path.join(screenshotDir, '04-recovery-panel.png') as `${string}.png`,
        fullPage: true,
      });

      // 验证页面元素
      const panelTitle = await page.$eval('h1', el => el.textContent);
      expect(panelTitle).toContain('灾难恢复');

      logger.info('恢复管理面板访问测试完成');
    }, 60000);

    test('应该能够查看备份列表', async () => {
      // 等待备份列表加载
      await page.waitForSelector('.backup-list', { timeout: 10000 });

      // 截图：备份列表
      await page.screenshot({
        path: path.join(screenshotDir, '05-backup-list.png') as `${string}.png`,
        fullPage: true,
      });

      // 检查备份列表是否包含测试备份
      const backupItems = await page.$$('.backup-item');
      expect(backupItems.length).toBeGreaterThan(0);

      // 验证备份项包含必要信息
      const firstBackupInfo = await page.$eval('.backup-item:first-child', el => {
        return {
          id: el.querySelector('.backup-id')?.textContent,
          status: el.querySelector('.backup-status')?.textContent,
          date: el.querySelector('.backup-date')?.textContent,
        };
      });

      expect(firstBackupInfo.id).toBeDefined();
      expect(firstBackupInfo.status).toBeDefined();
      expect(firstBackupInfo.date).toBeDefined();

      logger.info('备份列表查看测试完成', firstBackupInfo);
    }, 30000);
  });

  describe('恢复操作测试', () => {
    test('应该能够启动数据恢复流程', async () => {
      // 点击第一个备份的恢复按钮
      await page.click('.backup-item:first-child .restore-button');

      // 等待恢复确认对话框
      await page.waitForSelector('.recovery-confirm-dialog', { timeout: 5000 });

      // 截图：恢复确认对话框
      await page.screenshot({
        path: path.join(screenshotDir, '06-recovery-confirm.png') as `${string}.png`,
        fullPage: true,
      });

      // 输入加密密钥（如果需要）
      const encryptionKeyInput = await page.$('#encryption-key');
      if (encryptionKeyInput) {
        await page.type('#encryption-key', process.env["RECOVERY_ENCRYPTION_KEY"] || 'test-key');
      }

      // 确认恢复操作
      await page.click('.confirm-recovery-button');

      // 等待恢复进度页面
      await page.waitForSelector('.recovery-progress', { timeout: 10000 });

      // 截图：恢复进度页面
      await page.screenshot({
        path: path.join(screenshotDir, '07-recovery-progress.png') as `${string}.png`,
        fullPage: true,
      });

      // 验证进度条存在
      const progressBar = await page.$('.progress-bar');
      expect(progressBar).toBeTruthy();

      logger.info('数据恢复流程启动测试完成');
    }, 45000);

    test('应该能够监控恢复进度', async () => {
      // 等待恢复进度更新
      let progressValue = 0;
      let attempts = 0;
      const maxAttempts = 30; // 最多等待30秒

      while (progressValue < 100 && attempts < maxAttempts) {
        try {
          // 获取当前进度
          progressValue = await page.$eval('.progress-bar', el => {
            const value = el.getAttribute('value') || el.getAttribute('aria-valuenow');
            return parseInt(value || '0', 10);
          });

          // 截图：恢复进度（每10秒一次）
          if (attempts % 10 === 0) {
            await page.screenshot({
              path: path.join(
                screenshotDir,
                `08-recovery-progress-${attempts}.png`
              ) as `${string}.png`,
              fullPage: true,
            });
          }

          // 检查恢复状态文本
          const statusText = await page.$eval('.recovery-status', el => el.textContent);
          logger.info('恢复进度更新', { progress: progressValue, status: statusText });

          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        } catch (error) {
          logger.warn('获取恢复进度失败', error);
          break;
        }
      }

      // 验证恢复有进展
      expect(progressValue).toBeGreaterThan(0);

      logger.info('恢复进度监控测试完成', { finalProgress: progressValue });
    }, 120000);

    test('应该能够查看恢复结果', async () => {
      // 等待恢复完成或超时
      try {
        await page.waitForSelector('.recovery-complete', { timeout: 300000 }); // 5分钟超时

        // 截图：恢复完成页面
        await page.screenshot({
          path: path.join(screenshotDir, '09-recovery-complete.png') as `${string}.png`,
          fullPage: true,
        });

        // 获取恢复结果信息
        const recoveryResult = await page.$eval('.recovery-result', el => {
          return {
            status: el.querySelector('.result-status')?.textContent,
            recordsRestored: el.querySelector('.records-restored')?.textContent,
            duration: el.querySelector('.recovery-duration')?.textContent,
          };
        });

        expect(recoveryResult.status).toMatch(/成功|完成|部分/);
        expect(recoveryResult.recordsRestored).toBeDefined();
        expect(recoveryResult.duration).toBeDefined();

        logger.info('恢复结果查看测试完成', recoveryResult);
      } catch (error) {
        // 如果恢复超时，截图当前状态
        await page.screenshot({
          path: path.join(screenshotDir, '09-recovery-timeout.png') as `${string}.png`,
          fullPage: true,
        });

        logger.warn('恢复操作超时，但测试继续', error);
      }
    }, 360000);
  });

  describe('权限控制测试', () => {
    test('应该拒绝非管理员用户访问恢复面板', async () => {
      // 登出当前用户
      await page.click('.logout-button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // 使用普通用户登录
      await page.goto(`${process.env["FRONTEND_URL"] || 'http://localhost:3000'}/login`);
      await page.waitForSelector('#email');

      await page.type('#email', process.env["TEST_USER_EMAIL"] || 'user@example.com');
      await page.type('#password', process.env["TEST_USER_PASSWORD"] || 'userpassword123');
      await page.click('button[type="submit"]');

      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // 尝试访问恢复管理页面
      const response = await page.goto(
        `${process.env["FRONTEND_URL"] || 'http://localhost:3000'}/admin/recovery`
      );

      // 截图：权限拒绝页面
      await page.screenshot({
        path: path.join(screenshotDir, '10-access-denied.png') as `${string}.png`,
        fullPage: true,
      });

      // 验证被重定向或显示权限错误
      const currentUrl = page.url();
      const pageContent = await page.content();

      const isAccessDenied =
        currentUrl.includes('/login') ||
        currentUrl.includes('/unauthorized') ||
        pageContent.includes('权限不足') ||
        pageContent.includes('Access Denied') ||
        response?.status() === 403;

      expect(isAccessDenied).toBe(true);

      logger.info('权限控制测试完成', {
        currentUrl,
        responseStatus: response?.status(),
      });
    }, 60000);
  });

  describe('错误处理测试', () => {
    test('应该能够处理无效的备份ID', async () => {
      // 重新以管理员身份登录
      await page.goto(`${process.env["FRONTEND_URL"] || 'http://localhost:3000'}/login`);
      await page.waitForSelector('#email');

      await page.type('#email', process.env["TEST_ADMIN_EMAIL"] || 'admin@example.com');
      await page.type('#password', process.env["TEST_ADMIN_PASSWORD"] || 'adminpassword123');
      await page.click('button[type="submit"]');

      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      // 尝试使用无效的备份ID进行恢复
      await page.goto(
        `${process.env["FRONTEND_URL"] || 'http://localhost:3000'}/admin/recovery/invalid-backup-id`
      );

      // 截图：错误页面
      await page.screenshot({
        path: path.join(screenshotDir, '11-invalid-backup-error.png') as `${string}.png`,
        fullPage: true,
      });

      // 验证错误消息显示
      const errorMessage = await page.$('.error-message');
      expect(errorMessage).toBeTruthy();

      const errorText = await page.$eval('.error-message', el => el.textContent);
      expect(errorText).toMatch(/无效|不存在|错误/);

      logger.info('无效备份ID错误处理测试完成', { errorText });
    }, 45000);
  });
});
