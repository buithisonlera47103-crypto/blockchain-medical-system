import express from 'express';

import emergencyRouter from './emergency';
import fhirRouter from './fhir';
import permissionsRouter from './permissions';
import recordsRouter from './records';
const router = express.Router();
router.use('/records', recordsRouter);
router.use('/permissions', permissionsRouter);
router.use('/fhir', fhirRouter);
router.use('/emergency', emergencyRouter);
export default router;
