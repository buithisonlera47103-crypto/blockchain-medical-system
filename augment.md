# EMR System Completion Plan (augment.md)

## Executive Summary
This plan closes the key functional gaps to achieve a fully working blockchain-backed EMR per read111.md. Highest-priority items unblock end-to-end workflows and security:
- Align BlockchainService with chaincode: correct method names/signatures and reading paths
- Implement ABAC policy enforcement (time/location conditions) as middleware
- Add HSM-backed Key Management (KMS) and wire IPFS encryption to per-file data keys
- Complete encrypted search backend to match frontend and spec
- Add missing permission management APIs (role/permission readouts, permission check/history)

We deliver production-ready server changes with clear API specs, acceptance criteria, effort estimates, and dependencies.

## Prioritized Roadmap
1) P0: Blockchain ↔ Chaincode alignment (CreateMedicalRecord JSON arg; read aliases/fallbacks)
2) P0: ABAC policy middleware (time window, IP range) + basic policy store and route integration
3) P0: KMS (HSM-backed abstraction), per-file data keys, integrate with IPFS upload/download
4) P0: Encrypted search backend: unify request contract with frontend; per-record permission filtering; decryption context
5) P1: Permission APIs: /permissions/check, /users/{id}/roles, /records/{id}/access-list and /permission-history
6) P2: Merkle/versioning APIs (skeleton): version list + verify endpoints
7) P2: Performance/caching hooks (Redis CacheManager) around record metadata and permission checks

## Module-by-Module Implementation Details

### A. BlockchainService ↔ Chaincode
- Change createRecord to send a single JSON string for CreateMedicalRecord with fields: recordId, patientId, creatorId, ipfsCid, contentHash, timestamp.
- Update query/read call paths to prefer ReadRecord/GetRecord; remove references to GetMedicalRecord/GetAllRecords/VerifyRecord (not in current chaincode). Keep ValidateRecordIntegrity mapped to chaincode ValidateRecordIntegrity if needed.
- Keep robust fallbacks and detection via GetContractInfo.

Acceptance criteria:
- Creating a record succeeds and emits RecordCreated (chaincode) using CreateMedicalRecord(JSON)
- Reading a record works via ReadRecord/GetRecord
- checkAccess/grant/revoke continue to function

Est. effort: 0.5 day. Dependencies: none. Risk: low.

### B. ABAC Policy Enforcement
- Implement middleware abac.ts to evaluate policies for requests. Conditions:
  - Time window condition (e.g., 09:00–17:00 local or UTC configurable)
  - Source IP/CIDR allowlist (e.g., 192.168.1.0/24)
  - Role checks (doctor/nurse/patient) and emergency override flag
- Policy source: in-memory and optional record-level JSON policy (medical_records.access_policy) if present; otherwise default global policy.
- Apply to key routes: records download, encrypted search, permission check.

Acceptance criteria:
- Requests outside allowed time or IP range are denied (403) unless policy allows
- Emergency override header X-EMERGENCY: true bypasses policy when enabled
- ABAC logs decisions with reason codes

Est. effort: 1 day. Dependencies: none (DB column optional).

### C. HSM-Backed Key Management (KMS) + IPFS Encryption
- Create KeyManagementService (KMS) with pluggable providers:
  - HSMProvider (stub/mock using secure process memory), fallback EnvKeyProvider
  - API: generateDataKey(), storeKey(key) -> keyId, getKey(keyId), registerCidKey(cid,keyId), getKeyIdForCid(cid)
- Integrate with MedicalRecordService:
  - On create, generate per-file 32-byte data key; pass to IPFSService.uploadFile(..., dataKey)
  - After upload, register cid->keyId in KMS; store key in HSM provider
  - On download, resolve cid->keyId and use IPFSService.downloadFileWithKey(cid, key)
- Extend IPFSService metadata to include optional keyId when available (non-breaking)

Acceptance criteria:
- Files are encrypted with per-file keys; download succeeds using KMS
- No plain data keys persisted outside KMS provider; only keyId used
- If KMS disabled, defaultEncryptionKey path continues to work

Est. effort: 1–1.5 days. Dependencies: none (no external HSM required to start).

### D. Encrypted Search Backend Completion
- Align API to frontend: POST /api/v1/search/encrypted accepts { encryptedQuery, searchType, ... }
- Route supports both legacy { tokens } and new encryptedQuery path; internally uses EncryptedSearchService.submitEncryptedSearchRequest
- EncryptedSearchService enhancements:
  - verifyAccessPermissions: call chaincode/DB where appropriate; keep per-record CheckAccess filtering (already implemented)
  - Return payload with searchId, encryptedIndexes, metadata; provide GET /api/v1/encrypted-search/decrypt/:searchId for decryption context (already present)

Acceptance criteria:
- Frontend component EncryptedSearch works end-to-end (encrypt, submit, receive, decrypt)
- Server filters results by permission robustly (chaincode + DB)

Est. effort: 0.5–1 day. Dependencies: BlockchainService fixed.

### E. Permission Management APIs
- Add POST /api/v1/permissions/check { userId, recordId, action } ⇒ { hasAccess, reason, expiresAt? } (chaincode ValidateAccessWithReason/CheckAccess)
- Add GET /api/v1/users/{id}/roles ⇒ { role, permissions[] }
- Add GET /api/v1/records/{id}/access-list and /api/v1/records/{id}/permission-history (chaincode GetAccessList/GetPermissionHistory) [owner-only]

Acceptance criteria:
- API responses conform to spec and enforce authz/ownership where required
- Integrates with frontend and admin tooling

Est. effort: 0.5 day. Dependencies: BlockchainService fixed.

### F. Database Schema Updates (optional-now, recommended)
- Optional JSON column on medical_records: access_policy JSON NULL
- Optional table kms_keys (key_id PK, created_at) and cid_key_map (cid, key_id)
- Optional table encrypted_search_index (index_id PK, token_hash, record_id, field)

We will implement KMS in-memory maps now and keep DDL in a migration later.

Acceptance criteria:
- System runs without migrations; enabling columns/tables enhances persistence but isn’t required to function now.

Est. effort: 0.5 day to write migrations (deferred).

## API Specifications (new/updated)

- POST /api/v1/search/encrypted
  - Request: { encryptedQuery: string, searchType: 'keyword'|'semantic'|'fuzzy', dateRange?, department?, recordType? }
  - Response: { success: true, data: { searchId, encryptedIndexes: [...], totalMatches, searchMetadata } }

- GET /api/v1/encrypted-search/decrypt/:searchId
  - Response: { success: true, data: { searchId, keyIds: [...] } }

- POST /api/v1/permissions/check
  - Request: { userId: string, recordId: string, action: 'read'|'write'|'share'|'admin' }
  - Response: { hasAccess: boolean, reason?: string, expiresAt?: string }

- GET /api/v1/users/{id}/roles
  - Response: { userId, role, permissions: string[] }

- GET /api/v1/records/{recordId}/access-list
  - Owner-only: returns chaincode AccessList JSON

- GET /api/v1/records/{recordId}/permission-history
  - Owner-only: returns chaincode GetPermissionHistory JSON

## Configuration Changes
- ABAC: env vars ABAC_ENABLED=true, ABAC_TIME_WINDOW=09:00-17:00, ABAC_IP_CIDRS=192.168.1.0/24,10.0.0.0/8
- KMS: KMS_PROVIDER=hsm|env; when env, ENCRYPTION_KEY fallback remains
- Fabric: no change beyond existing env and wallet/profile paths

## Dependencies & Risks
- BlockchainService changes must be consistent with chaincode; we will not modify chaincode in this pass.
- KMS in-memory mapping means key state is ephemeral; enabling DB tables or external HSM persistence removes this risk.
- ABAC policies default to permissive if disabled to prevent regressions.

## Effort Estimate (calendar days)
- P0 items (A–E): ~3–4 days total
- P2 items (Merkle/versioning, performance caching): ~2 days later

---

## Acceptance Criteria Rollup
- CreateMedicalRecord works with JSON arg and record read works via chaincode methods
- ABAC middleware blocks requests violating time/IP policy; emergency override supported
- KMS per-file encryption end-to-end: upload and download succeed; no data key leakage
- Encrypted search flow works with the frontend component
- Permission APIs expose check, roles, access list, permission history and enforce authz

## Implementation Order
1) A (BlockchainService)
2) D (Encrypted search route alignment)
3) E (Permission APIs)
4) B (ABAC middleware; integrate on routes)
5) C (KMS; integrate with IPFS uploads/downloads)

This ordering keeps the system operational while progressively adding security and feature completeness.




---

## Final Completion Status (2025-09-11)

- Implemented and mounted tokens router: POST /api/v1/permissions/tokens (24h scoped record tokens)
- Uniform ABAC enforcement across sensitive routes (records downloads, encrypted search, FHIR mounts, permission token issuance)
- Completed Users Roles API: GET /api/v1/users/:id/roles with admin/self-access checks
- Records module: versions, integrity verification, content (supports temp tokens)
- Permission APIs: check, access-list, permission-history wired to BlockchainService where available
- KMS persistence helpers integrated with MedicalRecordService for per-file encryption and CID registration
- Redis-backed CacheManager integrated into CacheService for Redis operations; logging/metrics preserved
- FHIR endpoints mounted under /api/v1/fhir and /api/v1/fhir/r4 with ABAC middleware
- OpenAPI Swagger annotations added for token issuance endpoint
- Tooling status: TypeScript passes with 0 errors; ESLint passes with 0 warnings/errors

Remaining technical debt (tracked):
- Optional DB persistence for KMS keys and policy storage (current in-memory acceptable for dev/test)
- Broader OpenAPI coverage for all new/updated endpoints (partial annotations present)
- Event history pagination alignment with chaincode (if required by read111.md)
