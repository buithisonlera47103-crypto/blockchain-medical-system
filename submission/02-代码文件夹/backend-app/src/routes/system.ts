import express, { Request, Response, NextFunction } from 'express';

import { authenticateToken } from '../middleware/auth';
import { BlockchainService } from '../services/BlockchainService';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/v1/system/blockchain/status
router.get(
  '/blockchain/status',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
        const svc = (req.app.locals.blockchainService as BlockchainService | undefined) ?? BlockchainService.getInstance();
        const status = svc.getConnectionStatus();
        res.status(200).json({
          success: true,
          data: {
            isConnected: status.isConnected,
            retries: status.retries,
            maxRetries: status.maxRetries,
            channelName: status.config.channelName,
            chaincodeName: status.config.chaincodeName,
            org: status.config.currentOrg,
            timeoutMs: status.config.networkTimeout,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to get blockchain status', error);
        res.status(500).json({ success: false, message: 'Failed to get blockchain status' });
      }
    })().catch(next);
  }
);

// Minimal PKCS#11 interface for type safety
// Only the members we actually use are included
interface PKCS11JsLike {
  PKCS11: new () => {
    load: (path: string) => void;
    C_Initialize: () => void;
    C_GetSlotList: (tokenPresent: boolean) => unknown[];
    C_OpenSession: (slot: unknown, flags: number) => unknown;
    C_Login: (session: unknown, userType: number, pin: string) => void;
    C_GetSessionInfo: (session: unknown) => unknown;
    C_Logout: (session: unknown) => void;
    C_CloseSession: (session: unknown) => void;
    C_Finalize: () => void;
  };
  CKF_SERIAL_SESSION: number;
  CKF_RW_SESSION: number;
}

// GET /api/v1/system/hsm/health
router.get(
  '/hsm/health',
  authenticateToken,
  (_req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      const start = Date.now();
      const provider = (process.env.HSM_PROVIDER ?? 'simulated').trim();
      const strict = (process.env.HSM_STRICT ?? 'false').toLowerCase() === 'true';
      const modulePath = (process.env.HSM_PKCS11_MODULE_PATH ?? '').trim();
      const slotEnv = (process.env.HSM_PKCS11_SLOT ?? '').trim();
      const slotIndex = slotEnv !== '' ? Number(slotEnv) : 0;
      const pin = (process.env.HSM_PKCS11_PIN ?? '').trim();
      const keyLabel = (process.env.HSM_PKCS11_KEY_LABEL ?? '').trim();

      if (provider !== 'pkcs11') {
        res.status(200).json({
          success: true,
          data: {
            provider,
            strict,
            status: 'up',
            message: 'HSM provider is not pkcs11; running in simulated or non-HSM mode',
            config: { modulePath: null, slot: null, hasPin: false, keyLabel: null },
            durationMs: Date.now() - start,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!modulePath || pin === '') {
        const msg = 'PKCS#11 modulePath or PIN not configured';
        if (strict) {
          res.status(503).json({ success: false, message: msg });
          return;
        }
        res.status(200).json({
          success: true,
          data: {
            provider,
            strict,
            status: 'degraded',
            message: msg,
            config: { modulePath, slot: slotIndex, hasPin: pin !== '', keyLabel },
            durationMs: Date.now() - start,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let status: 'up' | 'down';
      let message = '';
      let durationMs = 0;
      try {
        const mod = (await import('pkcs11js')) as unknown as PKCS11JsLike;
        const pkcs11 = new mod.PKCS11();
        pkcs11.load(modulePath);
        pkcs11.C_Initialize();
        try {
          const slots = pkcs11.C_GetSlotList(true);
          if (!Array.isArray(slots) || slots.length === 0) throw new Error('No PKCS#11 slots available');
          const slot = slots[slotIndex] ?? slots[0];
          const session = pkcs11.C_OpenSession(slot, mod.CKF_SERIAL_SESSION | mod.CKF_RW_SESSION);
          pkcs11.C_Login(session, 1, pin);
          // probe session
          pkcs11.C_GetSessionInfo(session);
          // logout and close
          try { pkcs11.C_Logout(session); } catch { /* ignore */ }
          pkcs11.C_CloseSession(session);
          status = 'up';
          message = 'PKCS#11 session established successfully';
        } finally {
          try { pkcs11.C_Finalize(); } catch { /* ignore */ }
        }
      } catch (e) {
        status = 'down';
        message = e instanceof Error ? e.message : String(e);
        logger.warn('PKCS#11 health probe failed', { error: message });
      } finally {
        durationMs = Date.now() - start;
      }

      let httpStatus = 200;
      if (status !== 'up' && strict) {
        httpStatus = 503;
      }
      res.status(httpStatus).json({
        success: status === 'up' || !strict,
        data: {
          provider,
          strict,
          status,
          message,
          config: { modulePath, slot: slotIndex, hasPin: pin !== '', keyLabel },
          durationMs,
        },
        timestamp: new Date().toISOString(),
      });
    })().catch(next);
  }
);

export default router;

