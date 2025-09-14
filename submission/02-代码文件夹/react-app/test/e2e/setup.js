/**
 * E2E测试设置文件
 * 配置Puppeteer和测试环境
 */

const { configureToMatchImageSnapshot } = require('jest-image-snapshot');

// 配置图像快照匹配器
expect.extend({ toMatchImageSnapshot: configureToMatchImageSnapshot() });

// 设置测试超时
jest.setTimeout(60000);

// 全局变量
global.testTimeout = 60000;
global.baseUrl = process.env.BASE_URL || 'http://localhost:3000';

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 测试前设置
beforeAll(async () => {
  console.log('E2E测试环境初始化完成');
});

// 测试后清理
afterAll(async () => {
  console.log('E2E测试环境清理完成');
});
