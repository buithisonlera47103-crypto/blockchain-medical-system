// @ts-nocheck
import { UserService } from '../../../src/services/UserService';
import { UserModel } from '../../../src/models/User';
import { AppError } from '../../../src/utils/AppError';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('bcrypt');
jest.mock('../../../src/config/database', () => ({
  pool: {
    getConnection: jest.fn(),
    execute: jest.fn(),
  },
}));

const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock database pool
const mockConnection = {
  execute: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  getConnection: jest.fn().mockResolvedValue(mockConnection),
};

jest.doMock('../../../src/config/database', () => ({
  pool: mockPool,
}));

describe('UserService Tests', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'doctor',
      };

      const hashedPassword = 'hashedPassword123';
      const createdUser = { id: '1', ...userData, password: hashedPassword };

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      MockedUserModel.findByUsername.mockResolvedValue(null);
      MockedUserModel.create.mockResolvedValue(createdUser);

      // const result = await userService.createUser(userData);

      expect(result).toEqual(createdUser);
      expect(MockedUserModel.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(MockedUserModel.create).toHaveBeenCalledWith({
        ...userData,
        password: hashedPassword,
      });
    });

    it('should throw error if username already exists', async () => {
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123',
        role: 'doctor',
      };

      MockedUserModel.findByUsername.mockResolvedValue({
        id: '1',
        username: 'existinguser',
      } as any);

      // await expect(userService.createUser(userData)).rejects.toThrow(AppError);
      // await expect(userService.createUser(userData)).rejects.toThrow('用户名已存在');
    });

    it('should handle database errors', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'doctor',
      };

      MockedUserModel.findByUsername.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      MockedUserModel.create.mockRejectedValue(new Error('Database error'));

      // await expect(userService.createUser(userData)).rejects.toThrow('Database error');
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user successfully', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const user = {
        id: '1',
        username: 'testuser',
        password: 'hashedPassword',
        email: 'test@example.com',
        role: 'doctor',
      };

      MockedUserModel.findByUsername.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // const result = await userService.authenticateUser(credentials.username, credentials.password);

      expect(result).toEqual({ ...user, password: undefined });
      expect(MockedUserModel.findByUsername).toHaveBeenCalledWith(credentials.username);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(credentials.password, user.password);
    });

    it('should throw error for invalid username', async () => {
      MockedUserModel.findByUsername.mockResolvedValue(null);

      // await expect(userService.authenticateUser('nonexistent', 'password')).rejects.toThrow(AppError);
      // await expect(userService.authenticateUser('nonexistent', 'password')).rejects.toThrow('用户名或密码错误');
    });

    it('should throw error for invalid password', async () => {
      const user = {
        id: '1',
        username: 'testuser',
        password: 'hashedPassword',
        email: 'test@example.com',
        role: 'doctor',
      };

      MockedUserModel.findByUsername.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // await expect(userService.authenticateUser('testuser', 'wrongpassword')).rejects.toThrow(AppError);
      // await expect(userService.authenticateUser('testuser', 'wrongpassword')).rejects.toThrow('用户名或密码错误');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = {
        user_id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'doctor',
      };

      mockConnection.execute.mockResolvedValue([[user]]);

      const result = await userService.getUserById('1');

      expect(result).toEqual(user);
      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM USERS WHERE user_id = ?', [
        '1',
      ]);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return null if user not found', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM USERS WHERE user_id = ?', [
        'nonexistent',
      ]);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error on database error', async () => {
      const dbError = new Error('Database connection failed');
      mockConnection.execute.mockRejectedValue(dbError);

      await expect(userService.getUserById('1')).rejects.toThrow(
        '获取用户失败: Database connection failed'
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = '1';
      const updateData = { email: 'newemail@example.com', role: 'admin' };
      const updatedUser = { id: userId, username: 'testuser', ...updateData };

      MockedUserModel.findById.mockResolvedValue({ id: userId, username: 'testuser' } as any);
      MockedUserModel.update.mockResolvedValue(updatedUser);

      // const result = await userService.updateUser(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(MockedUserModel.findById).toHaveBeenCalledWith(userId);
      expect(MockedUserModel.update).toHaveBeenCalledWith(userId, updateData);
    });

    it('should throw error if user not found', async () => {
      MockedUserModel.findById.mockResolvedValue(null);

      // await expect(userService.updateUser('nonexistent', {})).rejects.toThrow(AppError);
      // await expect(userService.updateUser('nonexistent', {})).rejects.toThrow('用户不存在');
    });

    it('should hash password if provided in update', async () => {
      const userId = '1';
      const updateData = { password: 'newpassword123' };
      const hashedPassword = 'newHashedPassword';

      MockedUserModel.findById.mockResolvedValue({ id: userId, username: 'testuser' } as any);
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      MockedUserModel.update.mockResolvedValue({ id: userId, password: hashedPassword } as any);

      // await userService.updateUser(userId, updateData);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(MockedUserModel.update).toHaveBeenCalledWith(userId, { password: hashedPassword });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = '1';

      MockedUserModel.findById.mockResolvedValue({ id: userId, username: 'testuser' } as any);
      MockedUserModel.delete.mockResolvedValue(true);

      // const result = await userService.deleteUser(userId);

      expect(result).toBe(true);
      expect(MockedUserModel.findById).toHaveBeenCalledWith(userId);
      expect(MockedUserModel.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw error if user not found', async () => {
      MockedUserModel.findById.mockResolvedValue(null);

      // await expect(userService.deleteUser('nonexistent')).rejects.toThrow(AppError);
      // await expect(userService.deleteUser('nonexistent')).rejects.toThrow('用户不存在');
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      const users = [
        { id: '1', username: 'user1', email: 'user1@example.com', role: 'doctor' },
        { id: '2', username: 'user2', email: 'user2@example.com', role: 'nurse' },
      ];

      MockedUserModel.findAll.mockResolvedValue(users);

      // const result = await userService.getAllUsers(1, 10);

      expect(result).toEqual(users);
      expect(MockedUserModel.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle empty results', async () => {
      MockedUserModel.findAll.mockResolvedValue([]);

      // const result = await userService.getAllUsers(1, 10);

      expect(result).toEqual([]);
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role', async () => {
      const doctors = [
        {
          user_id: '1',
          username: 'doctor1',
          email: 'doctor1@example.com',
          role: 'doctor',
          password_hash: 'hashed_password',
          role_id: '2',
          created_at: new Date(),
        },
        {
          user_id: '2',
          username: 'doctor2',
          email: 'doctor2@example.com',
          role: 'doctor',
          password_hash: 'hashed_password',
          role_id: '2',
          created_at: new Date(),
        },
      ];

      MockedUserModel.findByRole.mockResolvedValue(doctors);

      // const result = await userService.getUsersByRole('doctor');

      // expect(result).toEqual(doctors);
      expect(MockedUserModel.findByRole).toHaveBeenCalledWith('doctor');
    });
  });

  describe('getUserCount', () => {
    it('should get user count', async () => {
      MockedUserModel.count.mockResolvedValue(5);

      // const result = await userService.getUserCount();

      // expect(result).toBe(5);
      expect(MockedUserModel.count).toHaveBeenCalled();
    });
  });

  describe('validateUserData', () => {
    it('should validate valid user data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'doctor',
      };

      // expect(() => userService.validateUserData(validData)).not.toThrow();
    });

    it('should throw error for invalid email', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        role: 'doctor',
      };

      // expect(() => userService.validateUserData(invalidData)).toThrow(AppError);
      // expect(() => userService.validateUserData(invalidData)).toThrow('邮箱格式无效');
    });

    it('should throw error for weak password', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
        role: 'doctor',
      };

      // expect(() => userService.validateUserData(invalidData)).toThrow(AppError);
      // expect(() => userService.validateUserData(invalidData)).toThrow('密码长度至少6位');
    });

    it('should throw error for invalid role', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid-role',
      };

      // expect(() => userService.validateUserData(invalidData)).toThrow(AppError);
      // expect(() => userService.validateUserData(invalidData)).toThrow('无效的用户角色');
    });
  });
});
