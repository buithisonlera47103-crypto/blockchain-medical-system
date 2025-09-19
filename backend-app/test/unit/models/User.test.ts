/**
 * User Model 单元测试
 */

import { jest } from '@jest/globals';

// Mock数据库连接 - 必须在任何导入之前
const mockConnection = {
  execute: jest.fn(),
  release: jest.fn(),
} as any;

const mockPool = {
  getConnection: jest.fn(),
} as any;

mockPool.getConnection.mockResolvedValue(mockConnection);

// Mock数据库配置
jest.mock('../../../src/config/database-mysql', () => ({
  pool: mockPool,
}));

import { UserModel, RoleModel } from '../../../src/models/User';
import { User, Role, UserRole } from '../../../src/types/User';

describe('UserModel 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('应该根据用户名找到用户', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed-password',
        role: 'doctor',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role_id: 'role-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);

      const result = await UserModel.findByUsername('testuser');

      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM USERS WHERE username = ?',
        ['testuser']
      );
      expect(mockConnection.release).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('用户不存在时应该返回null', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await UserModel.findByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('数据库错误时应该抛出异常', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('数据库连接失败'));

      await expect(UserModel.findByUsername('testuser')).rejects.toThrow(
        '查找用户失败: 数据库连接失败'
      );
    });
  });

  describe('findById', () => {
    it('应该根据用户ID找到用户', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed-password',
        role: 'doctor',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role_id: 'role-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);

      const result = await UserModel.findById('user-123');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM USERS WHERE user_id = ?',
        ['user-123']
      );
      expect(result).toEqual(mockUser);
    });

    it('用户不存在时应该返回null', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await UserModel.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('应该成功创建新用户', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed-password',
        role: 'doctor',
        status: 'active' as const,
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        role_id: 'role-123',
      };

      const createdUser: User = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        password_hash: userData.password_hash,
        role: userData.role,
        status: userData.status,
        emailVerified: userData.emailVerified,
        twoFactorEnabled: userData.twoFactorEnabled,
        createdAt: new Date(),
        updatedAt: new Date(),
        role_id: userData.role_id,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock插入操作和查询操作
      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 插入
        .mockResolvedValueOnce([[createdUser]]); // 查询创建的用户

      const result = await UserModel.create(userData);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'INSERT INTO USERS (user_id, username, password_hash, role_id) VALUES (?, ?, ?, ?)',
        [userData.id, userData.username, userData.password_hash, userData.role_id]
      );
      expect(result).toEqual(createdUser);
    });

    it('创建用户后无法找到用户时应该抛出异常', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed-password',
        role: 'doctor',
        status: 'active' as const,
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        role_id: 'role-123',
      };

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 插入成功
        .mockResolvedValueOnce([[]]); // 但找不到用户

      await expect(UserModel.create(userData)).rejects.toThrow(
        '创建用户后无法找到用户'
      );
    });

    it('数据库错误时应该抛出异常', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed-password',
        role: 'doctor',
        status: 'active' as const,
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        role_id: 'role-123',
      };

      mockConnection.execute.mockRejectedValueOnce(new Error('唯一约束冲突'));

      await expect(UserModel.create(userData)).rejects.toThrow(
        '创建用户失败: 唯一约束冲突'
      );
    });
  });

  describe('update', () => {
    it('应该成功更新用户信息', async () => {
      const userId = 'user-123';
      const updateData = {
        username: 'updateduser',
        password_hash: 'new-hashed-password',
      };

      const updatedUser: User = {
        id: userId,
        email: 'updated@example.com',
        username: 'updateduser',
        password_hash: 'new-hashed-password',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role_id: 'role-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 更新操作
        .mockResolvedValueOnce([[updatedUser]]); // 查询更新后的用户

      const result = await UserModel.update(userId, updateData);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE USERS SET .* WHERE user_id = \?/),
        expect.arrayContaining([...Object.values(updateData), userId])
      );
      expect(result).toEqual(updatedUser);
    });

    it('更新用户后无法找到用户时应该抛出异常', async () => {
      const userId = 'user-123';
      const updateData = { username: 'updateduser' };

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 更新成功
        .mockResolvedValueOnce([[]]); // 但找不到用户

      await expect(UserModel.update(userId, updateData)).rejects.toThrow(
        '更新用户后无法找到用户'
      );
    });
  });

  describe('delete', () => {
    it('应该成功删除用户', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await UserModel.delete('user-123');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'DELETE FROM USERS WHERE user_id = ?',
        ['user-123']
      );
      expect(result).toBe(true);
    });

    it('删除不存在的用户时应该返回false', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await UserModel.delete('nonexistent-id');

      expect(result).toBe(false);
    });

    it('数据库错误时应该抛出异常', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('外键约束失败'));

      await expect(UserModel.delete('user-123')).rejects.toThrow(
        '删除用户失败: 外键约束失败'
      );
    });
  });

  describe('findAll', () => {
    it('应该返回分页的用户列表', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          password_hash: 'hash1',
          role: 'doctor',
          status: 'active',
          emailVerified: true,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          role_id: 'role-1',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          username: 'user2',
          password_hash: 'hash2',
          role: 'patient',
          status: 'active',
          emailVerified: true,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          role_id: 'role-2',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockConnection.execute.mockResolvedValueOnce([mockUsers]);

      const result = await UserModel.findAll(10, 20);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM USERS ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [20, 10]
      );
      expect(result).toEqual(mockUsers);
    });

    it('应该使用默认的分页参数', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await UserModel.findAll();

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM USERS ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [50, 0]
      );
    });
  });

  describe('findByRole', () => {
    it('应该根据角色ID查找用户', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'doctor1@example.com',
          username: 'doctor1',
          password_hash: 'hash1',
          role: 'doctor',
          status: 'active',
          emailVerified: true,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          role_id: 'doctor-role',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockConnection.execute.mockResolvedValueOnce([mockUsers]);

      const result = await UserModel.findByRole('doctor-role');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM USERS WHERE role_id = ? ORDER BY created_at DESC',
        ['doctor-role']
      );
      expect(result).toEqual(mockUsers);
    });
  });

  describe('count', () => {
    it('应该返回用户总数', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ count: 42 }]]);

      const result = await UserModel.count();

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM USERS'
      );
      expect(result).toBe(42);
    });

    it('计数结果为null时应该返回0', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ count: null }]]);

      const result = await UserModel.count();

      expect(result).toBe(0);
    });

    it('没有结果时应该返回0', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await UserModel.count();

      expect(result).toBe(0);
    });
  });
});

describe('RoleModel 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByName', () => {
    it('应该根据角色名找到角色', async () => {
      const mockRole: Role = {
        id: 'role-123',
        role_name: 'doctor' as UserRole,
        description: '医生角色',
        created_at: new Date(),
      };

      mockConnection.execute.mockResolvedValueOnce([[mockRole]]);

      const result = await RoleModel.findByName('doctor' as UserRole);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM ROLES WHERE role_name = ?',
        ['doctor']
      );
      expect(result).toEqual(mockRole);
    });

    it('角色不存在时应该返回null', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await RoleModel.findByName('nonexistent' as UserRole);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('应该根据角色ID找到角色', async () => {
      const mockRole: Role = {
        id: 'role-123',
        role_name: 'doctor' as UserRole,
        description: '医生角色',
        created_at: new Date(),
      };

      mockConnection.execute.mockResolvedValueOnce([[mockRole]]);

      const result = await RoleModel.findById('role-123');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM ROLES WHERE role_id = ?',
        ['role-123']
      );
      expect(result).toEqual(mockRole);
    });
  });

  describe('findAll', () => {
    it('应该返回所有角色列表', async () => {
      const mockRoles: Role[] = [
        {
          id: 'role-1',
          role_name: 'doctor' as UserRole,
          description: '医生角色',
          created_at: new Date(),
        },
        {
          id: 'role-2',
          role_name: 'patient' as UserRole,
          description: '患者角色',
          created_at: new Date(),
        },
      ];

      mockConnection.execute.mockResolvedValueOnce([mockRoles]);

      const result = await RoleModel.findAll();

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT * FROM ROLES ORDER BY role_name'
      );
      expect(result).toEqual(mockRoles);
    });
  });

  describe('create', () => {
    it('应该成功创建新角色', async () => {
      const roleData = {
        id: 'role-123',
        role_name: 'doctor' as UserRole,
        description: '医生角色',
      };

      const createdRole: Role = {
        ...roleData,
        created_at: new Date(),
      };

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 插入
        .mockResolvedValueOnce([[createdRole]]); // 查询创建的角色

      const result = await RoleModel.create(roleData);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'INSERT INTO ROLES (role_id, role_name, description) VALUES (?, ?, ?)',
        [roleData.id, roleData.role_name, roleData.description]
      );
      expect(result).toEqual(createdRole);
    });

    it('创建角色后无法找到角色时应该抛出异常', async () => {
      const roleData = {
        id: 'role-123',
        role_name: 'doctor' as UserRole,
        description: '医生角色',
      };

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 插入成功
        .mockResolvedValueOnce([[]]); // 但找不到角色

      await expect(RoleModel.create(roleData)).rejects.toThrow(
        '创建角色后无法找到角色'
      );
    });
  });

  describe('update', () => {
    it('应该成功更新角色信息', async () => {
      const roleId = 'role-123';
      const updateData = {
        role_name: 'admin' as UserRole,
        description: '管理员角色',
      };

      const updatedRole: Role = {
        id: roleId,
        role_name: 'admin' as UserRole,
        description: '管理员角色',
        created_at: new Date(),
      };

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 更新
        .mockResolvedValueOnce([[updatedRole]]); // 查询更新后的角色

      const result = await RoleModel.update(roleId, updateData);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE ROLES SET .* WHERE role_id = \?/),
        expect.arrayContaining([...Object.values(updateData), roleId])
      );
      expect(result).toEqual(updatedRole);
    });
  });

  describe('delete', () => {
    it('应该成功删除角色', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await RoleModel.delete('role-123');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'DELETE FROM ROLES WHERE role_id = ?',
        ['role-123']
      );
      expect(result).toBe(true);
    });

    it('删除不存在的角色时应该返回false', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await RoleModel.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });
});

describe('内存管理测试', () => {
  beforeEach(() => {
    if (global.gc) global.gc();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (global.gc) global.gc();
  });

  it('应该处理多个并发查询而不会内存泄漏', async () => {
    const initialMemory = process.memoryUsage();

    // 模拟多个并发查询
    mockConnection.execute.mockResolvedValue([[]]);

    const promises = Array.from({ length: 10 }, (_, i) =>
      UserModel.findByUsername(`user${i}`)
    );

    await Promise.all(promises);

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // 内存增长应该控制在合理范围内
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
