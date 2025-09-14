import { UserModel, RoleModel } from '../../src/models/User';
import { User, Role, UserRole } from '../../src/types/User';

// Mock database pool
const mockConnection = {
  execute: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  getConnection: jest.fn().mockResolvedValue(mockConnection),
};

jest.mock('../../src/config/database-mysql', () => ({
  pool: mockPool,
}));

describe('Models Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UserModel', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.DOCTOR,
      role_id: 'role-1',
      status: 'active',
      emailVerified: true,
      twoFactorEnabled: false,
      createdAt: new Date('2024-01-01'),
      created_at: new Date('2024-01-01'),
    };

    describe('findByUsername', () => {
      it('should find user by username successfully', async () => {
        mockConnection.execute.mockResolvedValue([[mockUser]]);

        const result = await UserModel.findByUsername('testuser');

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM USERS WHERE username = ?',
          ['testuser']
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toEqual(mockUser);
      });

      it('should return null when user not found', async () => {
        mockConnection.execute.mockResolvedValue([[]]);

        const result = await UserModel.findByUsername('nonexistent');

        expect(result).toBeNull();
        expect(mockConnection.release).toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('Database error'));

        await expect(UserModel.findByUsername('testuser')).rejects.toThrow(
          '查找用户失败: Database error'
        );
      });
    });

    describe('findById', () => {
      it('should find user by ID successfully', async () => {
        mockConnection.execute.mockResolvedValue([[mockUser]]);

        const result = await UserModel.findById('user-1');

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM USERS WHERE user_id = ?',
          ['user-1']
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toEqual(mockUser);
      });

      it('should return null when user not found', async () => {
        mockConnection.execute.mockResolvedValue([[]]);

        const result = await UserModel.findById('nonexistent');

        expect(result).toBeNull();
        expect(mockConnection.release).toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('Database error'));

        await expect(UserModel.findById('user-1')).rejects.toThrow(
          '查找用户失败: Database error'
        );
      });
    });

    describe('create', () => {
      const newUserData = {
        id: 'user-2',
        email: 'newuser@example.com',
        username: 'newuser',
        password_hash: 'newhash',
        role: UserRole.PATIENT,
        role_id: 'role-2',
        status: 'active' as const,
        emailVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
      };

      it('should create user successfully', async () => {
        mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // Mock the findById call after creation
        mockConnection.execute.mockResolvedValueOnce([[{ ...mockUser, ...newUserData }]]);

        const result = await UserModel.create(newUserData);

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'INSERT INTO USERS (user_id, username, password_hash, role_id) VALUES (?, ?, ?, ?)',
          [newUserData.id, newUserData.username, newUserData.password_hash, newUserData.role_id]
        );
        expect(result).toEqual({ ...mockUser, ...newUserData });
      });

      it('should handle creation errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('Creation error'));

        await expect(UserModel.create(newUserData)).rejects.toThrow(
          '创建用户失败: Creation error'
        );
      });

      it('should handle case when created user cannot be found', async () => {
        mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        mockConnection.execute.mockResolvedValueOnce([[]]);

        await expect(UserModel.create(newUserData)).rejects.toThrow(
          '创建用户失败: 创建用户后无法找到用户'
        );
      });
    });

    describe('update', () => {
      const updateData = { username: 'updateduser', role_id: 'role-3' };

      it('should update user successfully', async () => {
        mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        mockConnection.execute.mockResolvedValueOnce([[{ ...mockUser, ...updateData }]]);

        const result = await UserModel.update('user-1', updateData);

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'UPDATE USERS SET username = ?, role_id = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          ['updateduser', 'role-3', 'user-1']
        );
        expect(result).toEqual({ ...mockUser, ...updateData });
      });

      it('should handle update errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('Update error'));

        await expect(UserModel.update('user-1', updateData)).rejects.toThrow(
          '更新用户失败: Update error'
        );
      });

      it('should handle case when updated user cannot be found', async () => {
        mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        mockConnection.execute.mockResolvedValueOnce([[]]);

        await expect(UserModel.update('user-1', updateData)).rejects.toThrow(
          '更新用户失败: 更新用户后无法找到用户'
        );
      });
    });

    describe('delete', () => {
      it('should delete user successfully', async () => {
        mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);

        const result = await UserModel.delete('user-1');

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'DELETE FROM USERS WHERE user_id = ?',
          ['user-1']
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should return false when no user was deleted', async () => {
        mockConnection.execute.mockResolvedValue([{ affectedRows: 0 }]);

        const result = await UserModel.delete('nonexistent');

        expect(result).toBe(false);
      });

      it('should handle deletion errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('Deletion error'));

        await expect(UserModel.delete('user-1')).rejects.toThrow(
          '删除用户失败: Deletion error'
        );
      });
    });

    describe('findAll', () => {
      const userList = [mockUser, { ...mockUser, id: 'user-2', username: 'user2' }];

      it('should find all users with default pagination', async () => {
        mockConnection.execute.mockResolvedValue([userList]);

        const result = await UserModel.findAll();

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM USERS ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [50, 0]
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toEqual(userList);
      });

      it('should find all users with custom pagination', async () => {
        mockConnection.execute.mockResolvedValue([userList]);

        const result = await UserModel.findAll(10, 20);

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM USERS ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [20, 10]
        );
        expect(result).toEqual(userList);
      });

      it('should handle findAll errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('FindAll error'));

        await expect(UserModel.findAll()).rejects.toThrow(
          '获取用户列表失败: FindAll error'
        );
      });
    });

    describe('findByRole', () => {
      const doctorUsers = [mockUser];

      it('should find users by role successfully', async () => {
        mockConnection.execute.mockResolvedValue([doctorUsers]);

        const result = await UserModel.findByRole('role-1');

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM USERS WHERE role_id = ?',
          ['role-1']
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toEqual(doctorUsers);
      });

      it('should handle findByRole errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('FindByRole error'));

        await expect(UserModel.findByRole('role-1')).rejects.toThrow(
          '查找用户失败: FindByRole error'
        );
      });
    });
  });

  describe('RoleModel', () => {
    const mockRole: Role = {
      id: 'role-1',
      role_name: UserRole.DOCTOR,
      description: 'Doctor role',
      created_at: new Date('2024-01-01'),
    };

    describe('findByName', () => {
      it('should find role by name successfully', async () => {
        mockConnection.execute.mockResolvedValue([[mockRole]]);

        const result = await RoleModel.findByName(UserRole.DOCTOR);

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM ROLES WHERE role_name = ?',
          [UserRole.DOCTOR]
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toEqual(mockRole);
      });

      it('should return null when role not found', async () => {
        mockConnection.execute.mockResolvedValue([[]]);

        const result = await RoleModel.findByName(UserRole.SUPER_ADMIN);

        expect(result).toBeNull();
        expect(mockConnection.release).toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('Database error'));

        await expect(RoleModel.findByName(UserRole.DOCTOR)).rejects.toThrow(
          '查找角色失败: Database error'
        );
      });
    });

    describe('findById', () => {
      it('should find role by ID successfully', async () => {
        mockConnection.execute.mockResolvedValue([[mockRole]]);

        const result = await RoleModel.findById('role-1');

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM ROLES WHERE role_id = ?',
          ['role-1']
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toEqual(mockRole);
      });

      it('should return null when role not found', async () => {
        mockConnection.execute.mockResolvedValue([[]]);

        const result = await RoleModel.findById('nonexistent');

        expect(result).toBeNull();
        expect(mockConnection.release).toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('Database error'));

        await expect(RoleModel.findById('role-1')).rejects.toThrow(
          '查找角色失败: Database error'
        );
      });
    });

    describe('findAll', () => {
      const roleList = [
        mockRole,
        { ...mockRole, id: 'role-2', role_name: UserRole.PATIENT, description: 'Patient role' },
      ];

      it('should find all roles successfully', async () => {
        mockConnection.execute.mockResolvedValue([roleList]);

        const result = await RoleModel.findAll();

        expect(mockConnection.execute).toHaveBeenCalledWith(
          'SELECT * FROM ROLES ORDER BY role_name'
        );
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result).toEqual(roleList);
      });

      it('should handle findAll errors', async () => {
        mockConnection.execute.mockRejectedValue(new Error('FindAll error'));

        await expect(RoleModel.findAll()).rejects.toThrow(
          expect.stringContaining('角色失败')
        );
      });
    });
  });
});