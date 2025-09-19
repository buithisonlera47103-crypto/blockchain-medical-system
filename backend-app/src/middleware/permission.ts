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
    // Allow when roles list is empty (no restriction)
    if (roles.length === 0) {
      next();
      return;
    }
    // Admin bypass
    if (req.user.role === 'admin') {
      next();
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

// Backward-compatible alias used by some tests
export function validatePermission(roles: string[]): (req: PermissionRequest, res: Response, next: NextFunction) => void {
  return requireAnyRole(roles);
}

// Backward-compatible alias expected by some older tests
export function checkPermissions(roles: string[]): (req: PermissionRequest, res: Response, next: NextFunction) => void {
  return requireAnyRole(roles);
}


export default {
  requirePermission,
  requireRole,
  requireAnyRole,
  checkPermissions,
};
