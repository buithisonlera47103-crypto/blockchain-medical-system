/**
 * 基本测试 - 验证测试框架是否正常工作
 */

test('basic test framework should work', () => {
  expect(1 + 1).toBe(2);
});

test('environment should be test', () => {
  expect(process.env["NODE_ENV"]).toBe('test');
});

test('async operations should work', async () => {
  const promise = Promise.resolve('success');
  const result = await promise;
  expect(result).toBe('success');
});

test('error handling should work', () => {
  expect(() => {
    throw new Error('test error');
  }).toThrow('test error');
});
