import { Router, Response, NextFunction } from 'express';

import { pool } from '../config/database-mysql';
import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function getPermissionsByRole(role?: string): string[] {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return ['*'];
    case 'doctor':
      return ['record:read', 'record:write', 'record:access:manage', 'search:encrypted'];
    case 'patient':
    default:
      return ['record:read:self', 'search:encrypted'];
  }
}

// GET /api/v1/users/:userId/roles
router.get(
  '/:userId/roles',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const requester = req.user;

      if (!requester) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: '用户未认证', statusCode: 401, timestamp: new Date().toISOString() });
        return;
      }

      // Allow self or admin to view
      if (requester.userId !== userId && (requester.role ?? '').toLowerCase() !== 'admin') {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Only admin or the user can view roles', statusCode: 403, timestamp: new Date().toISOString() });
        return;
      }

      const [rows] = (await pool.query(
        `SELECT u.user_id as id, r.role_name as role
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = ?`,
        [userId]
      )) as [Array<{ id: string; role: string | null }>, unknown];

      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'User not found', statusCode: 404, timestamp: new Date().toISOString() });
        return;
      }

      const role = rows[0]?.role ?? 'patient';
      const permissions = getPermissionsByRole(role);

      res.status(200).json({ userId, role, permissions });
    } catch (error) {
      next(error);
    }
  })
);

export default router;

