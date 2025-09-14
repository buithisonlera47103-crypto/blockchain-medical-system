/**
 * 用户模型 - 数据库操作相关的模型类
 */

import { pool } from '../config/database-mysql';
import { User, Role, UserRole } from '../types/User';

export class UserModel {
  /**
   * 根据用户名查找用户
   * @param username 用户名
   * @returns 用户信息或null
   */
  static async findByUsername(username: string): Promise<User | null> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM USERS WHERE username = ?', [username]);
      connection.release();

      const users = rows as User[];
      return users.length > 0 ? (users[0] ?? null) : null;
    } catch (error) {
      throw new Error(`查找用户失败: ${(error as Error).message}`);
    }
  }

  /**
   * 根据用户ID查找用户
   * @param userId 用户ID
   * @returns 用户信息或null
   */
  static async findById(userId: string): Promise<User | null> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM USERS WHERE user_id = ?', [userId]);
      connection.release();

      const users = rows as User[];
      return users.length > 0 ? (users[0] ?? null) : null;
    } catch (error) {
      throw new Error(`查找用户失败: ${(error as Error).message}`);
    }
  }

  /**
   * 创建新用户
   * @param userData 用户数据
   * @returns 创建的用户信息
   */
  static async create(userData: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    try {
      const connection = await pool.getConnection();
      await connection.execute(
        'INSERT INTO USERS (user_id, username, password_hash, role_id) VALUES (?, ?, ?, ?)',
        [userData.id, userData.username, userData.password_hash, userData.role_id]
      );
      connection.release();

      // 返回创建的用户信息
      const createdUser = await this.findById(userData.id);
      if (!createdUser) {
        throw new Error('创建用户后无法找到用户');
      }
      return createdUser;
    } catch (error) {
      throw new Error(`创建用户失败: ${(error as Error).message}`);
    }
  }

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param updateData 更新数据
   * @returns 更新后的用户信息
   */
  static async update(
    userId: string,
    updateData: Partial<Omit<User, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<User> {
    try {
      const connection = await pool.getConnection();

      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      await connection.execute(
        `UPDATE USERS SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [...values, userId]
      );
      connection.release();

      // 返回更新后的用户信息
      const updatedUser = await this.findById(userId);
      if (!updatedUser) {
        throw new Error('更新用户后无法找到用户');
      }
      return updatedUser;
    } catch (error) {
      throw new Error(`更新用户失败: ${(error as Error).message}`);
    }
  }

  /**
   * 删除用户
   * @param userId 用户ID
   * @returns 是否删除成功
   */
  static async delete(userId: string): Promise<boolean> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute('DELETE FROM USERS WHERE user_id = ?', [userId]);
      connection.release();

      return ((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
    } catch (error) {
      throw new Error(`删除用户失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取所有用户（分页）
   * @param offset 偏移量
   * @param limit 限制数量
   * @returns 用户列表
   */
  static async findAll(offset: number = 0, limit: number = 50): Promise<User[]> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM USERS ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      connection.release();

      return rows as User[];
    } catch (error) {
      throw new Error(`获取用户列表失败: ${(error as Error).message}`);
    }
  }

  /**
   * 根据角色查找用户
   * @param roleId 角色ID
   * @returns 用户列表
   */
  static async findByRole(roleId: string): Promise<User[]> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM USERS WHERE role_id = ? ORDER BY created_at DESC',
        [roleId]
      );
      connection.release();

      return rows as User[];
    } catch (error) {
      throw new Error(`根据角色查找用户失败: ${(error as Error).message}`);
    }
  }

  /**
   * 统计用户数量
   * @returns 用户总数
   */
  static async count(): Promise<number> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM USERS');
      connection.release();

      const result = rows as Array<{ count?: number }>;
      return result[0]?.count ?? 0;
    } catch (error) {
      throw new Error(`统计用户数量失败: ${(error as Error).message}`);
    }
  }
}

export class RoleModel {
  /**
   * 根据角色名查找角色
   * @param roleName 角色名
   * @returns 角色信息或null
   */
  static async findByName(roleName: UserRole): Promise<Role | null> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM ROLES WHERE role_name = ?', [
        roleName,
      ]);
      connection.release();

      const roles = rows as Role[];
      return roles.length > 0 ? (roles[0] ?? null) : null;
    } catch (error) {
      throw new Error(`查找角色失败: ${(error as Error).message}`);
    }
  }

  /**
   * 根据角色ID查找角色
   * @param roleId 角色ID
   * @returns 角色信息或null
   */
  static async findById(roleId: string): Promise<Role | null> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM ROLES WHERE role_id = ?', [roleId]);
      connection.release();

      const roles = rows as Role[];
      return roles.length > 0 ? (roles[0] ?? null) : null;
    } catch (error) {
      throw new Error(`查找角色失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取所有角色
   * @returns 角色列表
   */
  static async findAll(): Promise<Role[]> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM ROLES ORDER BY role_name');
      connection.release();

      return rows as Role[];
    } catch (error) {
      throw new Error(`获取角色列表失败: ${(error as Error).message}`);
    }
  }

  /**
   * 创建新角色
   * @param roleData 角色数据
   * @returns 创建的角色信息
   */
  static async create(roleData: Omit<Role, 'created_at'>): Promise<Role> {
    try {
      const connection = await pool.getConnection();
      await connection.execute(
        'INSERT INTO ROLES (role_id, role_name, description) VALUES (?, ?, ?)',
        [roleData.id, roleData.role_name, roleData.description]
      );
      connection.release();

      // 返回创建的角色信息
      const createdRole = await this.findById(roleData.id ?? '');
      if (!createdRole) {
        throw new Error('创建角色后无法找到角色');
      }
      return createdRole;
    } catch (error) {
      throw new Error(`创建角色失败: ${(error as Error).message}`);
    }
  }

  /**
   * 更新角色信息
   * @param roleId 角色ID
   * @param updateData 更新数据
   * @returns 更新后的角色信息
   */
  static async update(
    roleId: string,
    updateData: Partial<Omit<Role, 'role_id' | 'created_at'>>
  ): Promise<Role> {
    try {
      const connection = await pool.getConnection();

      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      await connection.execute(`UPDATE ROLES SET ${setClause} WHERE role_id = ?`, [
        ...values,
        roleId,
      ]);
      connection.release();

      // 返回更新后的角色信息
      const updatedRole = await this.findById(roleId);
      if (!updatedRole) {
        throw new Error('更新角色后无法找到角色');
      }
      return updatedRole;
    } catch (error) {
      throw new Error(`更新角色失败: ${(error as Error).message}`);
    }
  }

  /**
   * 删除角色
   * @param roleId 角色ID
   * @returns 是否删除成功
   */
  static async delete(roleId: string): Promise<boolean> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute('DELETE FROM ROLES WHERE role_id = ?', [roleId]);
      connection.release();

      return ((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
    } catch (error) {
      throw new Error(`删除角色失败: ${(error as Error).message}`);
    }
  }
}
