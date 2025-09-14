import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// 设置 MSW 服务器
export const server = setupServer(...handlers);

// 导出用于测试的工具函数
export const resetServer = () => {
  server.resetHandlers();
};

export const closeServer = () => {
  server.close();
};

export const startServer = () => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
};
