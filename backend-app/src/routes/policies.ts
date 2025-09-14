import express from 'express';


import { authenticateToken, requireRole } from '../middleware/auth';
import AccessControlPolicyEngine, { PolicyRule } from '../services/AccessControlPolicyEngine';
import { logger } from '../utils/logger';

const router = express.Router();
const engine = new AccessControlPolicyEngine();

// Lightweight async handler to satisfy no-misused-promises without changing router types
const asyncHandler = (
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>
) => (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  // Explicitly do not return the promise
  fn(req, res, next).catch(next);
};

// List all policies
router.get(
  '/',
  authenticateToken,
  requireRole(['admin']),
  (_req, res, _next): void => {
    try {
      const policies = engine.getAllPolicies();
      res.json({ policies, count: policies.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('List policies failed', { error: msg });
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  }
);

// Create a new policy
router.post(
  '/',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res): Promise<void> => {
    const body = req.body as Partial<PolicyRule>;
    if (!body?.name || !body?.subject || !body?.action || !body?.resource || !body?.effect || typeof body?.priority !== 'number') {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing required fields' });
      return;
    }
    const id = await engine.addPolicy({
      name: body.name,
      description: body.description,
      subject: body.subject,
      action: body.action,
      resource: body.resource,
      condition: body.condition,
      effect: body.effect,
      priority: body.priority,
      isActive: body.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: 'temp',
    } as unknown as PolicyRule);
    res.status(201).json({ id });
  })
);

// Update policy
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res): Promise<void> => {
    const p = req.params as { id?: string };
    const id = typeof p.id === 'string' ? p.id : '';
    if (!id) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing id' });
      return;
    }
    await engine.updatePolicy(id, req.body as Partial<PolicyRule>);
    res.json({ success: true });
  })
);

// Delete policy
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res): Promise<void> => {
    const p = req.params as { id?: string };
    const id = typeof p.id === 'string' ? p.id : '';
    if (!id) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing id' });
      return;
    }
    await engine.removePolicy(id);
    res.json({ success: true });
  })
);

// Reload policies (and roles cache)
router.post(
  '/reload',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (_req, res): Promise<void> => {
    await engine.reloadPolicies();
    res.json({ success: true });
  })
);

export default router;

