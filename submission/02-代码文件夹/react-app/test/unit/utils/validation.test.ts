/**
 * 验证工具函数单元测试
 */

import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateFileType,
  validateFileSize,
  sanitizeInput,
  formatFileSize,
  formatDate,
  generateSecurePassword,
  isValidPhoneNumber,
  isValidMedicalId,
  validateFile,
} from '../../../src/utils/validation';

describe('验证工具函数', () => {
  describe('validateEmail', () => {
    it('应该验证有效的邮箱地址', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@example-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('应该拒绝无效的邮箱地址', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@example.com',
        'user@',
        'user@@example.com',
        'user @example.com',
        'user@example.',
        'user@.com',
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('应该验证符合要求的密码', () => {
      const validPasswords = ['Password123!', 'StrongP@ss1', 'MySecure123#', 'Complex$Pass9'];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('应该检测密码长度不足', () => {
      const result = validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码长度至少8个字符');
    });

    it('应该检测缺少大写字母', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个大写字母');
    });

    it('应该检测缺少小写字母', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个小写字母');
    });

    it('应该检测缺少数字', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个数字');
    });

    it('应该检测缺少特殊字符', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个特殊字符');
    });

    it('应该检测多个问题', () => {
      const result = validatePassword('pass');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUsername', () => {
    it('应该验证有效的用户名', () => {
      const validUsernames = ['user123', 'test_user', 'username', 'user_name_123'];

      validUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(true);
      });
    });

    it('应该拒绝无效的用户名', () => {
      const invalidUsernames = [
        '',
        'ab',
        'a'.repeat(51),
        'user-name',
        'user@name',
        'user name',
        '123user',
        '_username',
      ];

      invalidUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(false);
      });
    });
  });

  describe('validateFileType', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    it('应该验证允许的文件类型', () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(validFile, allowedTypes)).toBe(true);
    });

    it('应该拒绝不允许的文件类型', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(validateFileType(invalidFile, allowedTypes)).toBe(false);
    });

    it('应该处理空文件类型', () => {
      const file = new File(['content'], 'test', { type: '' });
      expect(validateFileType(file, allowedTypes)).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('应该验证文件大小在限制内', () => {
      const file = new File(['a'.repeat(1024)], 'test.txt'); // 1KB
      expect(validateFileSize(file, 2048)).toBe(true); // 2KB limit
    });

    it('应该拒绝超过大小限制的文件', () => {
      const file = new File(['a'.repeat(2048)], 'test.txt'); // 2KB
      expect(validateFileSize(file, 1024)).toBe(false); // 1KB limit
    });

    it('应该处理零字节文件', () => {
      const file = new File([''], 'empty.txt');
      expect(validateFileSize(file, 1024)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('应该移除HTML标签', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });

    it('应该转义特殊字符', () => {
      const input = 'Hello & "World" <test>';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello &amp; &quot;World&quot; ');
    });

    it('应该处理空字符串', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('应该处理null和undefined', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('formatFileSize', () => {
    it('应该格式化字节大小', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });

    it('应该处理负数', () => {
      expect(formatFileSize(-1024)).toBe('0 B');
    });

    it('应该处理非数字', () => {
      expect(formatFileSize(NaN)).toBe('0 B');
      expect(formatFileSize(Infinity)).toBe('0 B');
    });
  });

  describe('formatDate', () => {
    it('应该格式化日期', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toMatch(/2024.*01.*15/);
    });

    it('应该支持默认格式', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toMatch(/2024.*1.*15/);
    });

    it('应该处理无效日期', () => {
      const invalidDate = new Date('invalid');
      expect(formatDate(invalidDate)).toBe('Invalid Date');
    });

    it('应该处理字符串日期', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/2024.*01.*15/);
    });
  });

  describe('generateSecurePassword', () => {
    it('应该生成指定长度的密码', () => {
      const password = generateSecurePassword(12);
      expect(password.length).toBe(12);
    });

    it('应该生成包含所有字符类型的密码', () => {
      const password = generateSecurePassword(20);

      expect(password).toMatch(/[a-z]/); // 小写字母
      expect(password).toMatch(/[A-Z]/); // 大写字母
      expect(password).toMatch(/[0-9]/); // 数字
      expect(password).toMatch(/[!@#$%^&*(),.?":{}|<>]/); // 特殊字符
    });

    it('应该生成不同的密码', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      expect(password1).not.toBe(password2);
    });

    it('应该处理最小长度', () => {
      const password = generateSecurePassword(4);
      expect(password.length).toBe(8); // 最小长度应该是8
    });
  });

  describe('isValidPhoneNumber', () => {
    it('应该验证有效的手机号码', () => {
      const validNumbers = [
        '13800138000',
        '15912345678',
        '18611111111',
        '+86 138 0013 8000',
        '86-138-0013-8000',
      ];

      validNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(true);
      });
    });

    it('应该拒绝无效的手机号码', () => {
      const invalidNumbers = [
        '',
        '123',
        '12345678901',
        '1234567890',
        'abcdefghijk',
        '138001380000',
      ];

      invalidNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(false);
      });
    });
  });

  describe('isValidMedicalId', () => {
    it('应该验证有效的医疗ID', () => {
      const validIds = ['DOC001', 'PAT12345', 'NUR999', 'ADM001'];

      validIds.forEach(id => {
        expect(isValidMedicalId(id)).toBe(true);
      });
    });

    it('应该拒绝无效的医疗ID', () => {
      const invalidIds = ['', 'ABC', 'ABC1234567890', 'abc123', '123456', 'DOC-001'];

      invalidIds.forEach(id => {
        expect(isValidMedicalId(id)).toBe(false);
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理极长的输入', () => {
      const longString = 'a'.repeat(10000);
      expect(() => validateEmail(longString)).not.toThrow();
      expect(() => sanitizeInput(longString)).not.toThrow();
    });

    it('应该处理特殊Unicode字符', () => {
      const unicodeString = '用户名123🔒';
      expect(() => sanitizeInput(unicodeString)).not.toThrow();
    });

    it('应该处理空白字符', () => {
      const whitespaceString = '   \t\n\r   ';
      expect(validateUsername(whitespaceString.trim())).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('验证函数应该在合理时间内完成', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        validateEmail('test@example.com');
        validatePassword('Password123!');
        validateUsername('testuser');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // 应该在100ms内完成
    });

    it('文件大小格式化应该处理大文件', () => {
      const largeSize = 1024 * 1024 * 1024 * 1024; // 1TB
      expect(() => formatFileSize(largeSize)).not.toThrow();
    });
  });
});
