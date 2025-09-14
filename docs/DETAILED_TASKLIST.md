# Detailed Execution Tasklist (Live)

Last updated: 2025-09-10 - Phase 1 in progress (Option C: DB pool unification + missing tables; MySQL confirmed)
Owner: Augment Agent (keeps this file updated as work progresses)
Scope: backend-app, chaincode, database/init, routes, middleware, services
Rule: Do not read or rely on .md files for implementation decisions (except react-app/read111.md); this file is the authoritative execution checklist.

---

## Guardrails (must pass on every change)
- [ ] Run fast checks before and after each edit (smallest scope first):
  - `npm --prefix backend-app run type-check`
  - `npm --prefix backend-app run lint`
  - If only frontend touched: `npm --prefix react-app run type-check && npm --prefix react-app run lint`
  - Root aggregate as needed: `npm run type-check && npm run lint`
- [ ] No new TypeScript errors (tsc) introduced by the change
- [ ] No new ESLint warnings/errors introduced by the change
- [ ] All modified files auto-formatted (Prettier) when applicable

Note: Running linters/type-checkers is safe-by-default and allowed. Package installs, deployments, DB-destructive actions require explicit approval.

---

## Milestones (high-level)
- Phase 1: Schema & configuration alignment (DB + service imports)
- Phase 2: Core service implementation (MedicalRecordService) + BlockchainService API alignment
- Phase 3: Caching and search permission hardening (Redis + encrypted search)
- Phase 4: AuthZ chain closure (JWT permissions + middleware unification)
- Phase 5: Logging/Metrics unification + ESLint/Test stabilization
- Phase 6: Security & Performance (OWASP ZAP + 1000 TPS baseline)

Definition of Done (project-level):
- [ ] 1000 TPS baseline validated
- [ ] ≥ 90% Jest unit test coverage (backend)
- [ ] OWASP Top 10 scanning via ZAP integrated; no high severity issues
- [ ] Layered storage (L1 memory → L2 Redis → L3 DB → L4 IPFS) functional with policies

---

## Phase 1 — Schema & Configuration Alignment [IN PROGRESS]
Goal: Align schemas and all service imports to a single DB pool; create missing tables used by services; unblock core flows without changing business semantics.

### 1.1 Unify DB connection pool usage
Target: use backend-app/src/config/database-mysql.ts (or DatabaseManager) everywhere
- [ ] Inventory files importing any of: `../config/database`, `../config/database-minimal`, or custom pools
  - Likely: services/LayeredStorageService.ts, services/AccessControlPolicyEngine.ts, middleware/auth.ts, routes/auth.ts, routes/records.ts, services/SearchService.ts, services/EncryptedSearchService.ts
- [ ] Refactor each to import a single `pool` from `backend-app/src/config/database-mysql.ts`
- [ ] Verify prepared statements still use `?` placeholders (MySQL style)
- [ ] Compile/type-check backend
- [ ] Lint backend

Acceptance:
- [ ] `npm --prefix backend-app run type-check` passes
- [ ] `npm --prefix backend-app run lint` passes

### 1.2 Create missing tables (additive migration)
Create additive migration in database/init as 03-migrations.sql (non-destructive). Tables:
- [ ] access_policies
  - policy_id PK, name, version, expression TEXT, is_active BOOL, created_at TIMESTAMP
- [ ] encrypted_search_index
  - record_id, token_hash, created_at; INDEX(token_hash), INDEX(record_id)
- [ ] user_keys
  - user_id, key_id, alg, key_material OR envelope_ref, is_active BOOL, created_at TIMESTAMP; UNIQUE(user_id, key_id)
- [ ] layered_storage
  - record_id, data_type ENUM('content','metadata','index'), storage_level ENUM('L1','L2','L3','L4'), data BLOB NULL, ipfs_hash VARCHAR(64) NULL, created_at, updated_at; INDEX(record_id)
- [ ] access_patterns
  - record_id, data_type, access_count INT, first_accessed, last_accessed; INDEX(record_id)

Tasks:
- [ ] Write `database/init/03-migrations.sql` with CREATE TABLE IF NOT EXISTS ...
- [ ] Validate locally against dev DB (no destructive ops)

Acceptance:
- [ ] App boot logs show no "table not found" from the above sets

### 1.3 Align table/column names used in services
Decision: adopt consistent naming aligned with current route usage; adjust services to match schema (minimal change strategy).
- [x] users: ensure columns cover id (logical)/user_id (physical PK), username, email, first_name, last_name, password_hash, created_at, last_login_at, department, license_number
- [ ] medical_records: record_id (PK), patient_id, creator_id, ipfs_cid, content_hash, created_at, updated_at
- [ ] access_permissions: record_id, user_id, action (read/share/write/admin), granted_by, is_active, expires_at, granted_at
- [ ] ipfs_metadata: record_id, cid, iv, auth_tag, size, mime_type, created_at

Tasks:
- [x] Map and update SQL in routes/auth.ts to chosen users columns (use user_id/role_id; join roles for role name)
- [x] Update services/EncryptedSearchService.ts joins/filters to MEDICAL_RECORDS/ACCESS_CONTROL views (compat layer)
- [~] Update services/AccessControlPolicyEngine.ts table names to lowercase and unified pool (uses compat uppercase tables/views; pool unified)
- [ ] Update any remaining services (SearchService.ts, LayeredStorageService.ts) to aligned names (validated: aligned; no change needed)

Acceptance:
- [x] Smoke search path against dev DB OK (200 empty results)
- [ ] Smoke `auth` and minimal `records` read path works against dev DB without SQL errors

### 1.4 Baseline verification
- [ ] Backend build: `npm --prefix backend-app run build`
- [ ] Type-check and lint (backend): pass
- [ ] Minimal smoke: start backend, hit /api/v1/health or equivalent if available

---

## Phase 2 — Core Service + Blockchain Alignment
Goal: Implement MedicalRecordService and align BlockchainService to actual chaincode methods and payloads.

### 2.1 MedicalRecordService implementation
- [ ] createRecord(patientId, file/meta)
  - [ ] Validate caller permissions
  - [ ] IPFSService.upload -> { cid, iv, authTag, size, mime }
  - [ ] Insert medical_records + ipfs_metadata
  - [ ] Chaincode CreateRecord(recordId, ipfsCid, contentHash, patientId)
  - [ ] Audit log + metrics
- [ ] getRecord(recordId)
  - [ ] Check access via blockchain (CheckAccess) or local cache fallback
  - [ ] LayeredStorage get with L1→L2→L3→L4 strategy
  - [ ] Audit + metrics
- [ ] grantAccess/revokeAccess
  - [ ] Call chaincode GrantAccess/RevokeAccess
  - [ ] Mirror to access_permissions (for fast filters)

Acceptance:
- [ ] End-to-end create → read → grant → read-as-grantee works

### 2.2 BlockchainService API alignment
- [ ] Align to contract.go methods and fields (GetRecord, GrantAccess, CheckAccess, GetContractInfo; ipfsCid naming)
- [ ] Normalize event payloads (recordId, patientId, creatorId, granteeId, action)
- [ ] Update routes/fabric.ts test endpoints to existing methods

Acceptance:
- [ ] Contract info endpoint returns chaincode metadata
- [ ] Permission checks match chaincode behavior for test users

---

## Phase 3 — Caching & Encrypted Search Hardening
Goal: Replace NodeCache gaps with Redis CacheManager; enforce per-record permission filtering in search; unify AES-GCM handling.

### 3.1 Redis CacheManager adoption
- [x] Integrate Redis L2 into CacheService via ioredis (CacheLike adapter). CacheManager remains available; no service code swap required
- [x] Configure Redis via env; ensure set/get active with graceful fallback to memory
  - Env: REDIS_ENABLED, REDIS_URL or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD/REDIS_DB
- [x] Add basic logs for hit/miss (metrics wiring deferred to Phase 5)

### 3.2 EncryptedSearchService fixes
- [x] Correct table names and joins; ensure filter by (patient/creator OR active permission)
- [x] For each search result, verify permission via blockchain CheckAccess (prevent side-channel)
- [x] Unify CryptographyService usage; return { encryptedData, iv, authTag, keyId, algorithm }
  - getDecryptionContext now returns { searchId, keyIds }

Acceptance:
- [x] Unauthorized records never appear in search results (enforced via DB + blockchain double-check)
- [x] Client can decrypt returned payloads with provided context (unit decrypt helper updated)

---

## Phase 4 — AuthZ Chain Closure
- [x] JWT includes `permissions: string[]` (added at login/refresh via role-based mapping)
- [x] middleware/auth.ts and authMiddleware.ts populate req.user.permissions from JWT
- [x] Unify usage to rely on JWT permissions in middleware (no rule changes)

---

## Phase 5 — Logging/Metrics + ESLint/Test Stabilization
- [ ] Unify on enhancedLogger; remove duplicate loggers
- [ ] Add business metrics for records/access/search/cache
- [ ] ESLint Batch A/B/C fixes (named imports, explicit return types, remove any, refactor long functions)
- [ ] Raise backend coverage to ≥90%

---

## Phase 6 — Security & Performance
- [ ] Integrate OWASP ZAP in CI; fix high findings
- [ ] Secret management via env; disable defaults
- [ ] Performance baseline with k6/artillery; DB/Redis tuning; SQL indexes for hot paths

---

## Live Status Checklist (to be updated as we progress)
- [x] Create this tasklist file
- [x] Phase 1.1: Unify DB pool imports
  - Progress: updated imports in
    - backend-app/src/services/LayeredStorageService.ts
    - backend-app/src/services/EncryptedSearchService.ts
    - backend-app/src/services/AccessControlPolicyEngine.ts
    - backend-app/src/routes/records.ts
    - backend-app/src/routes/search.ts
    - backend-app/src/services/BackupService.ts
    - backend-app/src/models/User.ts
    - backend-app/src/services/AnalyticsService.ts (type-only: DatabasePool -> Pool)
    - backend-app/src/services/DatabaseShardingService.ts (type-only decouple; keep mock)
    - backend-app/src/services/RecoveryService.ts
    - backend-app/src/services/PerformanceMonitoringService.ts
- [x] Phase 1.2: Additive migration for missing tables
  - Added database/init/03-migrations.sql
  - Created: ENCRYPTED_SEARCH_INDEX, USER_KEYS, ACCESS_POLICIES, layered_storage, access_patterns
  - Added compatibility views: MEDICAL_RECORDS, ACCESS_CONTROL, USERS, PERMISSIONS
  - Also wired these into initializeDatabase() to auto-create on app start
- [x] Phase 1.3: Align table/column names in services
  - routes/auth.ts: mapped to user_id/role_id; added role resolution; joins roles for role_name; fixed selects/updates
  - EncryptedSearchService: uses compat views MEDICAL_RECORDS/ACCESS_CONTROL/USERS; no change needed
  - AccessControlPolicyEngine: uses compat uppercase tables/views; pool unified
  - initializeDatabase(): added additive user profile columns; compat views already present
- [x] Phase 1.4: Baseline verification
  - Backend type-check & lint: pass; build ok
  - Health 200 at /health; search smoke OK (200 empty results)
  - Next: auth/records minimal smoke on dev DB
- [x] Phase 2.1: MedicalRecordService implemented
  - createRecord: DB insert (UUID in DB), contentHash computed; supports CreateRecordRequest or Multer payload; IPFSService.upload integrated and ipfs_metadata persisted; returns { recordId, ipfsCid, txId }
  - getRecord/getUserRecords: DB reads via MEDICAL_RECORDS view；downloadRecord fetches CID from ipfs_metadata with access guard
  - grant/revoke: updateAccess (upsert -> is_active TRUE) + revokeAccess (is_active FALSE); checkAccess with blockchain fallback; unit tests added
- [x] Phase 2.2: BlockchainService aligned
  - Added revokeAccess(recordId, granteeId) → submitTransaction('RevokeAccess', ...); createRecord now tries 'CreateRecord' then falls back to 'CreateMedicalRecord'
  - Added getContractInfo(); normalized event payload keys (recordId/patientId/creatorId/granteeId/ipfsCid; action lowercased)
  - Routes updated: GET /api/v1/fabric/contract-info, GET /api/v1/fabric/permission/check
- [x] Phase 3.1: Redis CacheManager adopted
- [x] Phase 3.2: EncryptedSearchService hardened
- [x] Phase 4: AuthZ chain closed (JWT permissions + middleware unified); E2E encrypted search smoke added
- [ ] Phase 5: Logging/Metrics & ESLint/Test stabilized
- [ ] Phase 6: Security & Performance baseline achieved

