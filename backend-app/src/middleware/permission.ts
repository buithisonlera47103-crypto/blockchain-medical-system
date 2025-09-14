import { Request, Response, NextFunction } from 'express';

export type PermissionRequest = Request & {
  user?: {
    id: string;
    role: string;
    permissions?: string[];
  };
}

export function requirePermission(
  permission: string
): (req: PermissionRequest, res: Response, next: NextFunction) => void {
  return (req: PermissionRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!req.user.permissions?.includes(permission)) {
      res
        .status(403)
        .json({ success: false, message: `Permission '${permission}' required` });
      return;
    }
    next();
  };
}

export function requireRole(
  role: string
): (req: PermissionRequest, res: Response, next: NextFunction) => void {
  return (req: PermissionRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ success: false, message: `Role '${role}' required` });
      return;
    }
    next();
  };
}

export function requireAnyRole(
  roles: string[]
): (req: PermissionRequest, res: Response, next: NextFunction) => void {
  return (req: PermissionRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ success: false, message: `One of roles [${roles.join(', ')}] required` });
      return;
    }
    next();
  };
}

export default {
  requirePermission,
  requireRole,
  requireAnyRole,
};
