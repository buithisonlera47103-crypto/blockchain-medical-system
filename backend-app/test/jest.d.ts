/// <reference types="jest" />

// Jest 全局类型声明
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidJWT(): R;
      toBeOneOf(expected: any[]): R;
    }
  }
}

export {};