/**
 * bcrypt Mock - 用于测试环境
 */

module.exports = {
  compare: jest.fn().mockResolvedValue(true), // 测试环境下总是返回密码匹配
  hash: jest.fn().mockResolvedValue('$2b$10$mockedHashValue'),
  genSalt: jest.fn().mockResolvedValue('$2b$10$mockedSalt'),
  hashSync: jest.fn().mockReturnValue('$2b$10$mockedHashValue'),
  compareSync: jest.fn().mockReturnValue(true),
};